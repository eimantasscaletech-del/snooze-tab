var closeDelay = 1000, colorList = [], isInEditMode = false, isInDupeMode = false, iconTheme, debounce;
async function init() {
	isInEditMode = getUrlParam('type') && getUrlParam('type') === 'edit';
	isInDupeMode = getUrlParam('type') && getUrlParam('type') === 'clone';

	iconTheme = await getOptions('icons');
	if (!iconTheme) iconTheme = 'human';

	await fetchHourFormat();
	await buildChoices();
	await buildCustomChoice();
	await buildRepeatCustomChoice();
	setUpPopupTabs();
	await initHabitica();
	startClock();
	await initBookmarks();

	document.querySelectorAll('.nap-room-btn, .settings').forEach(btn => btn.addEventListener('click', el => {
		openExtensionTab(el.target.dataset.href);
		setTimeout(_ => window.close(), 100);
	}));
	document.querySelectorAll('.nap-room-btn, .settings').forEach(btn => btn.onkeyup = e => {
		if (e.which === 13 || e.which === 32) {
			openExtensionTab(btn.dataset.href);
			setTimeout(_ => window.close(), 100);
		}
	});
	if (getBrowser() === 'firefox') {
		chrome.tabs.onActivated.addListener(_ => setTimeout(_ => window.close(), 50))
		chrome.runtime.onMessage.addListener(msg => {if (msg.closePopup) window.close()});
	}
	if (getBrowser() === 'safari') chrome.runtime.sendMessage({wakeUp: true});

	closeDelay = await getOptions('closeDelay');
	var tabs = await getSnoozedTabs();
	if (!(isInEditMode || isInDupeMode) && tabs && tabs.length) {
		var todayCount = sleeping(tabs).filter(t => dayjs(t.wakeUpTime).dayOfYear() === dayjs().dayOfYear() && dayjs(t.wakeUpTime).year() === dayjs().year()).length;
		if (todayCount > 0) document.querySelector('.upcoming').setAttribute('data-today', todayCount);
	}
	document.getElementById('repeat').addEventListener('change', toggleRepeat);

	document.addEventListener('keyup', e => {
		var isOverlayOpen = document.querySelector('.form-overlay').classList.contains('show');
		if (e.keyCode >= 49 && e.keyCode <= 58 && !isOverlayOpen) {
			var choices = document.querySelectorAll('.choice');
			var selectedChoice = choices && choices.length > 0 ? choices[e.keyCode - 48 - 1] : false;
			if (!selectedChoice || selectedChoice.classList.contains('disabled')) return;
			choices.forEach(c => c.classList.remove('focused'));
			selectedChoice.focus();
		}
		if (e.keyCode === 48 && !isOverlayOpen) {
			document.querySelectorAll('.choice').forEach(c => c.classList.remove('focused'))
			document.querySelector('.choice:last-of-type').focus();
		}
		if ((e.which === 13 || e.which === 32) && !isOverlayOpen) {
			var selectedChoice = document.querySelector('.choice.focused');
			if (!selectedChoice) return;
			selectedChoice.click();
		}
		if (e.keyCode === 67 && !isOverlayOpen) document.querySelector('.custom-choice').click();
		if (e.keyCode === 67 && isOverlayOpen) document.querySelector('.overlay-close-btn').click();
		if (e.keyCode === 84 && !isOverlayOpen) document.getElementById('tab').click();
		if (e.keyCode === 87 && !isOverlayOpen) document.getElementById('window').click();
		if (e.keyCode === 83 && !isOverlayOpen) document.getElementById('selection').click();
		if (e.keyCode === 82) document.getElementById('repeat').click();
		if ((isInEditMode || isInDupeMode) && parent && parent.closeModalOnOutsideClick) parent.closeModalOnOutsideClick(e);
	});
	['mouseover', 'focus'].forEach(e => document.querySelector('.keyboard').addEventListener(e, _ => document.body.classList.add('show-shortcuts')));
	['mouseout', 'blur'].forEach(e => document.querySelector('.keyboard').addEventListener(e, _ => document.body.classList.remove('show-shortcuts')));
	if (isInEditMode || isInDupeMode) {
		initEditMode(isInDupeMode);
	} else {
		await buildTargets();
	}
	if ((isInEditMode || isInDupeMode) && parent && parent.resizePopupIframe) parent.resizePopupIframe();
}
function setUpPopupTabs() {
	document.querySelectorAll('.popup-tab').forEach(tab => tab.addEventListener('click', _ => {
		if (tab.dataset.panel === 'pomodoro-panel') {
			setTimeout(initPomoPanel, 0);
			setTimeout(populatePomoPanelTasks, 50);
		}
		if (tab.dataset.panel === 'calendar-panel') {
			setTimeout(initCalendarPanel, 0);
		}
		togglePopupTab(tab.dataset.panel);
	}));
}
function togglePopupTab(panelId) {
	document.querySelectorAll('.popup-tab').forEach(tab => {
		var active = tab.dataset.panel === panelId;
		tab.classList.toggle('active', active);
		tab.setAttribute('aria-selected', active ? 'true' : 'false');
	});
	document.querySelectorAll('.popup-panel').forEach(panel => {
		var active = panel.id === panelId;
		panel.classList.toggle('active', active);
		panel.hidden = !active;
	});
}
async function initEditMode(isDupe) {
	togglePopupTab('snooze-panel');
	document.querySelector('.panel-title').innerText = isDupe ? 'Duplicate What?' : 'Edit What?'
	document.getElementById('targets').classList.add('hidden');
	document.querySelectorAll('.target').forEach(t => t.classList.remove('active'));
	document.querySelector('.footer').classList.add('hidden');
	var t = await getSnoozedTabs(getUrlParam('tabId'));
	if (t.repeat) document.getElementById('repeat').click();
	document.getElementById('preview-text').innerText = t.title;
	document.getElementById('preview-favicon').src = t.tabs ? `../icons/${iconTheme}/${t.selection ? 'selection' : 'window'}.png` : (getUrlParam('noImg') ? '../icons/unknown.png' : getFaviconUrl(t.url));
	document.getElementById(t.tabs ? (t.selection ? 'selection' : 'window') : 'tab').classList.add('active');
}
async function toggleRepeat(e) {
	if (document.querySelector('.repeat-choice.disabled')) return;
	var repeat = e.target.checked;
	var choices = await getChoices();
	var config = await getOptions(['popup']);
	Object.entries(choices).forEach(async ([name, o]) => {
		var c = document.getElementById(name);
		c.classList.toggle('disabled', ((!repeat && !!o.disabled) || (repeat && !!o.repeatDisabled)));
		c.classList.toggle('always-disabled', ((!repeat && !!o.disabled) || (repeat && !!o.repeatDisabled)));
		if (['weekend', 'monday', 'week', 'month'].includes(name)) o.time = await getTimeWithModifier(name);
		c.querySelector('.label .text').innerText = repeat ? o.repeatLabel : o.label;
		if (name !== 'startup') {
			c.querySelector('.date').innerText = repeat ? o.repeatTimeString : o.timeString;
			c.querySelector('.time').innerText = repeat ? o.repeatTime : dayjs(o.time).format(`${getHourFormat(dayjs(o.time).minute() !== 0)}`);
		}
		if (['weekend', 'monday', 'week', 'month'].includes(name)) c.querySelector('select').dispatchEvent(new Event('change'));
	});
	var custom = document.getElementById('custom');
	custom.querySelector('.label').innerText = repeat ? 'Choose a custom interval' : 'Choose your own time';
	document.querySelector('.repeat-container').classList.toggle('hidden', !repeat);
}

async function buildTargets() {
	var allTabs = await getTabsInWindow();
	if (!allTabs || !allTabs.length) return;
	if (allTabs.length === undefined) allTabs = [allTabs];

	var activeTab = allTabs.find(at => at.active);
	var validTabs = allTabs.filter(t => !isDefault(t) && isValid(t));

	var isActiveTabValid = validTabs.includes(activeTab);
	document.getElementById('tab').classList.toggle('disabled', !isActiveTabValid);
	var isWindowValid = getBrowser() !== 'safari' && (validTabs.length > 1 || validTabs.length === 1 && !isActiveTabValid);
	document.getElementById('window').classList.toggle('disabled', !isWindowValid);
	var isSelectionValid = getBrowser() !== 'safari' && validTabs.length > 1 && activeTab.highlighted && validTabs.filter(t => t.highlighted).length > 1;
	document.getElementById('selection').classList.toggle('disabled', !isSelectionValid);

	document.querySelectorAll('.target').forEach(t => t.tabIndex = t.classList.contains('disabled') ? -1 : 0);
	document.querySelectorAll('.target').forEach(t => t.addEventListener('keyup', e => { if (e.which === 13) t.click() }));

	document.getElementById('group').style.display = 'none';

	if (isSelectionValid) {
		document.getElementById('selection').classList.add('active');
	} else if (isActiveTabValid) {
		document.getElementById('tab').classList.add('active');
	} else if (isWindowValid) {
		document.getElementById('window').classList.add('active');
	} else {
		document.querySelectorAll('.choice, .custom-choice, h3, .repeat-choice, #repeat').forEach(c => {c.classList.add('disabled');c.setAttribute('tabindex','-1')});
		return document.getElementById('preview-text').innerText = `Can't snooze this tab`;
	}
	await generatePreview(document.querySelector('.target.active').id)

	document.querySelectorAll('.target').forEach(t => t.addEventListener('click', async e => {
		if (t.classList.contains('disabled') || t.classList.contains('active')) return;
		document.querySelectorAll('.target').forEach(s => s.classList.remove('active'));
		t.classList.add('active');
		document.getElementById('icon').classList.toggle('flipped');
		await generatePreview(t.id);
	}));
}

async function generatePreview(type) {
	var previewText = document.getElementById('preview-text');
	var previewIcon = document.getElementById('preview-favicon');

	var allTabs = await getTabsInWindow();
	if (!allTabs || !allTabs.length) return;
	if (allTabs.length === undefined) allTabs = [allTabs];
	
	if (type === 'tab') {
		var a = allTabs.find(at => at.active)
		previewText.innerText = a.title;
		previewIcon.onload = _ => {if (previewIcon && previewIcon.height === 16 && previewIcon.width === 16) previewIcon.src = '../icons/unknown.png';}
		previewIcon.src = a.favIconUrl ? a.favIconUrl : (getBrowser() === 'safari' ? getFaviconUrl(a.url) : '../icons/unknown.png');
	} else if (type === 'window') {
		var validTabs = allTabs.filter(t => !isDefault(t) && isValid(t));
		previewText.innerText = `${getTabCountLabel(validTabs)} from ${getSiteCountLabel(validTabs)}`;
		previewIcon.src = `../icons/${iconTheme}/window.png`;
	} else if (type === 'selection') {
		var validTabs = allTabs.filter(t => !isDefault(t) && isValid(t) && t.highlighted);
		previewText.innerText = `${validTabs.length} selected tabs from ${getSiteCountLabel(validTabs)}`;
		previewIcon.src = `../icons/${iconTheme}/selection.png`;
	} else {
		previewText.innerText = `Can't snooze this tab`;
	}
}

async function buildChoices() {
	var choices = await getChoices();
	var config = await getOptions(['popup']);
	colorList = gradientSteps('#F3B845', '#DF4E76', Math.ceil(Object.keys(choices).length / 2) + 1);
	document.querySelector('.section.choices').append(...(Object.entries(choices).map(([name, o], i) => {
		var icon = Object.assign(document.createElement('img'), {src: `../icons/${iconTheme}/${name}.png`});
		
		var selectWrapper = '' 
		if (['weekend', 'monday', 'week', 'month'].includes(name)) {
			var s = config.popup && config.popup[name] ? config.popup[name] : 'morning';
			var morning = Object.assign(document.createElement('option'), {value: 'morning', innerText: 'Morning', selected: s === 'morning'});
			var evening = Object.assign(document.createElement('option'), {value: 'evening', innerText: 'Evening', selected: s === 'evening'});
			var now = Object.assign(document.createElement('option'), {value: 'now', innerText: 'Current Time', selected: s === 'now'});

			var select = document.createElement('select');
			select.tabIndex = -1;
			select.addEventListener('change', async e => {
				await savePopupOptions();
				// change time
				var t = await getTimeWithModifier(name);
				document.querySelector(`#${name} .time`).innerText = t.format(getHourFormat(t.minute() !== 0));
				// resize dropdown
				var d = Object.assign(document.createElement('select'), {style: {visibility: 'hidden', position: 'fixed'}});
				var o = Object.assign(document.createElement('option'), {innerText: e.target.options[e.target.selectedIndex].text});
				d.append(o);
				e.target.after(d);
				e.target.style.width = `${d.getBoundingClientRect().width}px`;
				d.remove();
			});
			select.append(morning, evening, now);
			selectWrapper = wrapInDiv({classList: 'select-wrapper'}, select);
		}

		var label = wrapInDiv({classList: 'label'}, wrapInDiv({className: 'text', innerText: o.label}), selectWrapper);
		var date = wrapInDiv({classList: 'date', innerText: o.timeString});
		var time = wrapInDiv({classList: 'time', innerText: dayjs(o.time).format(getHourFormat(dayjs(o.time).minute() !== 0))});

		var c = wrapInDiv({
			id: name,
			classList: `choice ${o.disabled ? 'disabled always-disabled' : ''}`,
			style: `--bg:${colorList[Math.floor(i / 2)]}`,
			tabIndex: o.disabled ? -1 : 0,
		}, wrapInDiv('', icon, label), o.startUp ? wrapInDiv() : wrapInDiv('', date, time));
		c.setAttribute('data-repeat-id', o.repeat_id);
		c.addEventListener('mouseover', _ => c.classList.add('focused'))
		c.addEventListener('mouseout', _ => c.classList.remove('focused'));
		if (['weekend', 'monday', 'week', 'month'].includes(name)) c.addEventListener('keydown', e => {
			if (!e || e.which !== 38 && e.which !== 40) return;
			var options = select.querySelectorAll('option');
			var current = Array.from(options).findIndex(o => o.selected);
			if (e.which === 38 && current > 0) options[current - 1].selected = true;
			if (e.which === 40 && current < options.length - 1) options[current + 1].selected = true;
			select.dispatchEvent(new Event('change'));
		})
		c.onclick = e => {if (!['OPTION', 'SELECT'].includes(e.target.nodeName)) snooze(o.startUp ? 'startup' : o.time, c)}
		c.onkeyup = e => {if (e.which === 13 || e.which === 32) snooze(o.startUp ? 'startup' : o.time, c)}
		return c
	})));
	document.querySelectorAll('.section.choices .choice select').forEach(s => s.dispatchEvent(new Event('change')));
}

async function buildRepeatCustomChoice() {
	var date = flatpickr('#monthly', {
		inline: true,
		mode: 'multiple',
		minDate: '2020-03-01',
		maxDate: '2020-03-31',
		onChange: validate,
		onValueUpdate: validate
	});
	var time = flatpickr('#repeat-time', {
		inline: true,
		enableTime: true,
		noCalendar: true,
		time_24hr: HOUR_FORMAT && HOUR_FORMAT === 24,
		defaultDate: dayjs().add(1, 'd').format('HH:mm'),
		onChange: validate,
		onValueUpdate: validate
	});
	var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	var firstDayOfWeek = await getOptions('weekStart') || 0;
	var config = await getOptions(['morning', 'evening']);
	dayNames.slice(firstDayOfWeek).concat(dayNames.slice(0, firstDayOfWeek)).forEach(day => {
		var span = Object.assign(document.createElement('span'), {innerText: day});
		span.setAttribute('data-value', dayNames.indexOf(day));
		span.addEventListener('click', _ => {
			span.classList.toggle('active')
			validate();
		});
		document.querySelector('.repeat-week-wrapper div').append(wrapInDiv({className: 'day-choice'}, span));
	});

	var reset = _ => {
		date.setDate([]);
		time.setDate(dayjs().format('HH:mm'));
		document.querySelectorAll('.day-choice span.active').forEach(s => s.classList.remove('active'));
		validate();
	}

	var validate = async _ => {
		await new Promise(r => setTimeout(r, 50));
		var isValid = false, isWeekly = document.querySelector('.repeat-interval.active').getAttribute('data-type') === 'weekly';
		document.querySelector('.date-display').innerText = `Select ${isWeekly ? 'days' : 'dates'}`;
		document.querySelector('.time-display').innerText = dayjs(time.selectedDates).format(getHourFormat(true));
		document.querySelector('.submit-btn').classList.toggle('disabled', true);
		document.getElementById('next-wakeup').innerText = '-';
		if (isWeekly) {
			var days = Array.from(document.querySelectorAll('.day-choice span.active')).map(s => parseInt(s.getAttribute('data-value')));
			if (days.length) {
				document.querySelector('.date-display').innerText = days.length <= 2 ? `${days.map(d => dayNames[d].substring(0,3 )).join(', ')} every week` : `${days.length} days every week`;
				isValid = true;
			}
		} else if (date.selectedDates.length) {
			var dates = date.selectedDates, isValid = true;
			document.querySelector('.date-display').innerText = dates.length === 1 ? `${dates.map(d => getOrdinal(dayjs(d).format('D'))).join(', ')} of every month` : `${dates.length} days every month`;
		} 
		document.querySelectorAll('.repeat-time-wrapper .action').forEach(a => {
			var action = a.getAttribute('data-value'), actionValue = dayjs();
			if (action == 'morning') actionValue = dayjs().startOf('d').add(config.morning[0], 'h').add(config.morning[1], 'm');
			if (action == 'evening') actionValue = dayjs().startOf('d').add(config.evening[0], 'h').add(config.evening[1], 'm');
			a.classList.toggle('disabled', dayjs(time.selectedDates).format('HHmm') === actionValue.format('HHmm'));
		});
		if (isValid) {
			var data = {type: 'custom', time: [dayjs(time.selectedDates).hour(), dayjs(time.selectedDates).minute()]};
			if (document.querySelector('.repeat-interval.active').getAttribute('data-type') === 'weekly') {
				data.weekly = Array.from(document.querySelectorAll('.day-choice span.active')).map(d => parseInt(d.getAttribute('data-value'))).sort(desc);
			} else {
				data.monthly = document.getElementById('monthly')._flatpickr.selectedDates.map(d => dayjs(d).date()).sort(desc);
			}
			var wakeUpTime = await calculateNextSnoozeTime(data);
			document.getElementById('next-wakeup').innerText = formatSnoozedUntil({wakeUpTime});
			document.querySelector('.submit-btn').classList.toggle('disabled', false);
		}
	}

	if (document.querySelector('.repeat-time-wrapper .f-am-pm')) document.querySelector('.repeat-time-wrapper .f-am-pm').addEventListener('click', validate);
	document.querySelector('.repeat-time-wrapper .reset-action').addEventListener('click', _ => {reset();validate()});

	document.querySelector('.repeat-month-wrapper .f-days').addEventListener('click', validate);
	document.querySelectorAll('.repeat-time-wrapper input').forEach(i => {
		i.addEventListener('blur', validate);
		i.addEventListener('increment', validate);
		i.addEventListener('keyup', e => {if (e.which && (e.which === 38 || e.which === 40)) validate()});
	});
	document.querySelectorAll('.repeat-time-wrapper .action').forEach(a => a.addEventListener('click', _ => {
		if (a.classList.contains('disabled')) return;
		var action = a.getAttribute('data-value'), actionValue = dayjs();
		if (action == 'morning') actionValue = dayjs().startOf('d').add(config.morning[0], 'h').add(config.morning[1], 'm');
		if (action == 'evening') actionValue = dayjs().startOf('d').add(config.evening[0], 'h').add(config.evening[1], 'm');
		time.setDate(actionValue.toDate());
		validate();
	}));

	document.getElementById('repeat').addEventListener('change', e => {if (e.target.checked) validate()});
	document.querySelectorAll('.repeat-interval').forEach(ri => ri.addEventListener('click', e => {
		if (e.target.classList.contains('active')) return;

		document.querySelectorAll('.repeat-interval').forEach(rs => rs.classList.remove('active'));
		e.target.classList.add('active');

		document.querySelectorAll('.repeat-section > div.r-section').forEach(rdw => rdw.classList.add('hidden'));
		if (e.target.getAttribute('data-type') == 'weekly') document.querySelector('.repeat-week-wrapper').classList.remove('hidden');
		if (e.target.getAttribute('data-type') == 'monthly') {
			document.querySelector('.repeat-month-wrapper').classList.remove('hidden');
			var m = document.querySelector('.repeat-month-wrapper'), days = Array.from(m.querySelectorAll('.dayContainer .f-day:not(.f-disabled):not(.nextMonthDay)'));
			var bounds = days.map(d => d.getBoundingClientRect()).map((b, i) => ({index: i, left: b.left, right: b.right, top: b.top, bottom: b.bottom}));
			var func = (x, y) => {
				bounds.filter(b => b.left <= x && x <= b.right && b.top <= y && y <= b.bottom).forEach(b => {
					date.setDate([...new Set(date.selectedDates.map(d => dayjs(d).format('YYYY-MM-DD')).concat(`2020-03-${days[b.index].innerText}`))])
				});
				validate();
			}
			var selectMultipleDates = e => {
				clearTimeout(debounce);
				debounce = setTimeout(_ => func(e.clientX, e.clientY), 15);
			}
			m.addEventListener('mousedown', e => {e.preventDefault(); m.addEventListener('mouseover', selectMultipleDates)});
			m.addEventListener('mouseup', e => {e.preventDefault(); m.removeEventListener('mouseover', selectMultipleDates)});
			m.addEventListener('mouseleave', e => {m.removeEventListener('mouseover', selectMultipleDates)});
		}
		validate();
	}));
}

async function buildCustomChoice() {
	var firstDayOfWeek = await getOptions('weekStart') || 0;
	var date = flatpickr('#date', {
		inline: true,
		defaultDate: dayjs().format('YYYY-MM-DD'),
		minDate: dayjs().format('YYYY-MM-DD'),
		locale: {firstDayOfWeek}
	});
	var time = flatpickr('#time', {
		inline: true,
		enableTime: true,
		noCalendar: true,
		time_24hr: HOUR_FORMAT && HOUR_FORMAT === 24,
		defaultDate: dayjs().format('HH:mm'),
		onChange: validate,
		onValueUpdate: validate
	});
	

	var getDateTime = _ => {
		return dayjs(dayjs(date.selectedDates).format('YYYY-MM-DD') + dayjs(time.selectedDates).format('HH:mm'))
	};

	var reset = _ => {
		var now = dayjs();
		time.setDate(now.format('HH:mm'));
		date.setDate(now.format('YYYY-MM-DD'));
	}

	var validate = async _ => {
		await new Promise(r => setTimeout(r, 50));
		var now = dayjs();
		document.querySelectorAll('.time-wrapper .action').forEach(action => {
			action.classList.toggle('disabled', (getDateTime().add(parseInt(action.getAttribute('data-value')), 'm') < now));
		});
		if (getDateTime() < now) reset()
		time.set('minTime', getDateTime().dayOfYear() === now.dayOfYear() ? now.format('HH:mm') : null);
		document.querySelector('.date-display').innerText = dayjs(date.selectedDates).format('ddd, D MMM');
		document.querySelector('.time-display').innerText = dayjs(time.selectedDates).format(getHourFormat(true));
		document.querySelector('.submit-btn').classList.toggle('disabled', getDateTime() <= now);
		return getDateTime() > now;
	}

	var submitButton = wrapInDiv({
		classList: 'submit-btn disabled',
		innerText: 'snoozz',
		onclick: async e => {
			if (e.target.classList.contains('disabled') || !(await validate())) return;
			snooze(getDateTime(), customChoice)
		}
	});

	var icon = Object.assign(document.createElement('img'), {src: `../icons/${iconTheme}/custom.png`})
	var label = wrapInDiv({classList: 'label', innerText: 'Choose your own time'})
	var customChoice = wrapInDiv({
		id: 'custom',
		classList: 'custom-choice',
		style: `--bg: ${colorList[colorList.length - 1]}`,
		tabIndex: 0,
		onclick: _ => {
			customChoice.classList.add('focused');
			document.querySelectorAll('.choice').forEach(c => {c.classList.add('disabled');c.setAttribute('tabindex','-1')});
			document.querySelector('.popup-checkbox input').setAttribute('tabindex', '-1');
			document.querySelector('.form-overlay').classList.add('show');
			document.querySelector('.keyboard').classList.remove('show');
		},
		onkeydown: e => {
			if (!e || e.which !== 13 && e.which !== 32) return;
			customChoice.classList.add('focused');
			document.querySelectorAll('.choice').forEach(c => {c.classList.add('disabled');c.setAttribute('tabindex','-1')});
			document.querySelector('.form-overlay').classList.add('show');
			document.querySelector('.keyboard').classList.remove('show');
		}
	}, wrapInDiv('', icon, label), wrapInDiv('custom-info', wrapInDiv('display', wrapInDiv('date-display'), wrapInDiv('time-display')), submitButton));
	document.querySelector('.section.special-choices').prepend(customChoice);
	customChoice.setAttribute('data-repeat-id', 'custom');
	customChoice.addEventListener('mouseover', _ => customChoice.classList.add('really-focused'))
	customChoice.addEventListener('mouseout', _ => customChoice.classList.remove('really-focused'))

	// attach listeners
	document.querySelector('.overlay-close-btn').addEventListener('click', _ => {
		customChoice.classList.remove('focused');
		document.querySelectorAll('.choice').forEach(c => {c.classList.remove('disabled');c.setAttribute('tabindex','0')});
		document.querySelector('.popup-checkbox input').setAttribute('tabindex', '0');
		document.querySelector('.form-overlay').classList.remove('show');
		document.querySelector('.keyboard').classList.add('show');
	})
	document.querySelectorAll('.time-wrapper .action').forEach(action => action.addEventListener('click', _ => {
		if (action.classList.contains('disabled')) return;
		var amount = parseInt(action.getAttribute('data-value'));
		if (Math.abs(amount) > 1000) {
			date.setDate(dayjs(date.selectedDates).add(amount, 'm').toDate());
		} else {
			if (dayjs(time.selectedDates).add(amount, 'm').dayOfYear() != dayjs(time.selectedDates).dayOfYear()) {
				date.setDate(dayjs(date.selectedDates).add(amount < 0 ? -1 : 1, 'd').toDate());
			}
			time.setDate(dayjs(time.selectedDates).add(amount, 'm').toDate());
		}
		validate();
	}));
	if (document.querySelector('.time-wrapper .f-am-pm')) document.querySelector('.time-wrapper .f-am-pm').addEventListener('click', validate);
	
	document.querySelector('.time-wrapper .reset-action').addEventListener('click', _ => {reset();validate()});

	document.querySelector('.date-wrapper .f-days').addEventListener('click', e => {if (e.target.classList.contains('f-day')) validate()});
	document.querySelectorAll('.time-wrapper input').forEach(i => {
		i.addEventListener('blur', validate);
		i.addEventListener('increment', validate);
		i.addEventListener('keyup', e => {if (e.which && (e.which === 38 || e.which === 40)) validate()});
	});

	document.getElementById('repeat').addEventListener('change', e => {if (!e.target.checked) validate()});
	validate();
}

async function modify(time, choice) {
	if (parent && parent.deleteTabFromDiv) parent.deleteTabFromDiv(getUrlParam('tabId'));
	var response = await editSnoozed(getUrlParam('tabId'), time, isInDupeMode);
	if (!response.edited && !response.duped) return;
	await displayPreviewAnimation(choice, time.format ? time.format('.HHmm') : '', response.duped ? 'Welcome to the clone zone' : 'Going back to sleep');
	if (parent && parent.closePopupModal) setTimeout(_ => parent.closePopupModal(), closeDelay);
}

async function snooze(time, choice) {
	time = ['weekend', 'monday', 'week', 'month'].includes(choice.id) ? await getTimeWithModifier(choice.id) : time;
	var response, target = document.querySelector('.target.active');
	if (!['tab', 'window', 'selection', 'group'].includes(target.id)) return;

	if (document.getElementById('repeat').checked) {
		var t, data = {type: choice.getAttribute('data-repeat-id')}
		data.time = data.type === 'startup' ? [0, 0] : [time.hour(), time.minute()];
		if (data.type === 'daily') data.time = [dayjs().hour(), dayjs().minute()];
		if (data.type === 'weekends') data.weekly = [6];
		if (data.type === 'mondays') data.weekly = [1];
		if (data.type === 'weekly') data.weekly = [dayjs().day()];
		if (data.type === 'monthly') data.monthly = [dayjs().date()];
		if (data.type === 'custom') {
			var pickr = dayjs(document.getElementById('repeat-time')._flatpickr.selectedDates);
			data.time = [pickr.hour(), pickr.minute()];
			if (document.querySelector('.repeat-interval.active').getAttribute('data-type') === 'weekly') {
				data.weekly = Array.from(document.querySelectorAll('.day-choice span.active')).map(d => parseInt(d.getAttribute('data-value'))).sort(desc);
			}
			if (document.querySelector('.repeat-interval.active').getAttribute('data-type') === 'monthly') {
				data.monthly = document.getElementById('monthly')._flatpickr.selectedDates.map(d => dayjs(d).date()).sort(desc);
			}
		}
		if ((isInEditMode || isInDupeMode) && getUrlParam('tabId')) {
			if (parent && parent.deleteTabFromDiv) parent.deleteTabFromDiv(getUrlParam('tabId'));
			response = await editRecurringSnoozed(getUrlParam('tabId'), data, isInDupeMode);
			if (!response.edited && !response.duped) return;
			await displayPreviewAnimation(choice, time.format ? time.format('.HHmm') : '', response.duped ? 'Duplicating...' : 'Going back to sleep');
			if (parent && parent.closePopupModal) setTimeout(_ => parent.closePopupModal(), closeDelay);
		} else {
			response = await snoozeRecurring(target.id, data);
		}
	} else if ((isInEditMode || isInDupeMode) && getUrlParam('tabId')) {
		return modify(time, choice);
	} else if (target.id === 'tab') {
		response = await snoozeTab(time);
	} else if (target.id === 'window') {
		response = await snoozeWindow(time);
	} else if (target.id === 'selection') {
		response = await snoozeWindow(time, true);
	}
	if (!response || (!response.tabId && !response.windowId)) return;
	await chrome.runtime.sendMessage(Object.assign(response, {close: true, delay: closeDelay}));
	await displayPreviewAnimation(choice, time.format ? time.format('.HHmm') : '', `Snoozing ${target.id}`)
}

async function displayPreviewAnimation(choice, time, text = 'Snoozing') {
	await chrome.runtime.sendMessage({poll: `${choice.id}${time}`});
	document.body.style.pointerEvents = 'none';
	choice.classList.add('focused');
	var preview = document.getElementById('preview');
	preview.classList.add('snoozed');
	preview.textContent = '';
	preview.appendChild(Object.assign(document.createElement('span'), {
		textContent: text,
		style: {
			transition: `color 400ms ease-in-out ${(closeDelay/2) - 250}ms`,
			color: '#000',
		}
	}));
	preview.style.transition = `background-position ${closeDelay - 100}ms linear`
	preview.style.backgroundImage = `linear-gradient(to right, ${getComputedStyle(choice).backgroundColor} 50%, ${getComputedStyle(preview).backgroundColor} 0)`
	preview.classList.add('animate');
}
async function savePopupOptions() {
	var o = await getOptions();
	o.popup = {
		weekend: document.querySelector('#weekend select').value,
		monday: document.querySelector('#monday select').value,
		week: document.querySelector('#week select').value,
		month: document.querySelector('#month select').value
	}
	await saveOptions(o);
}

// --- Habitica integration ---

var HABITICA_APP_ID = 'snooze-tab-habitica';

async function initHabitica() {
	var o = await getOptions();
	var userId = o && o.habiticaUserId;
	var apiToken = o && o.habiticaApiToken;
	if (userId && apiToken) {
		showHabiticaTasksView();
		fetchHabiticaTasks(userId, apiToken);
	} else {
		showHabiticaForm();
	}
	document.getElementById('habitica-save-btn').addEventListener('click', onHabiticaSave);
	document.getElementById('habitica-disconnect-btn').addEventListener('click', onHabiticaDisconnect);
}

async function onHabiticaSave() {
	var userId = document.getElementById('habitica-user-id').value.trim();
	var apiToken = document.getElementById('habitica-api-token').value.trim();
	var errorEl = document.getElementById('habitica-error');
	errorEl.textContent = '';
	if (!userId || !apiToken) {
		errorEl.textContent = 'Both fields are required.';
		return;
	}
	document.getElementById('habitica-save-btn').disabled = true;
	document.getElementById('habitica-save-btn').textContent = 'Connecting...';
	var result = await fetchHabiticaTasksData(userId, apiToken);
	document.getElementById('habitica-save-btn').disabled = false;
	document.getElementById('habitica-save-btn').textContent = 'Save & Load Tasks';
	if (!result.ok) {
		errorEl.textContent = result.error || 'Failed to connect. Check your credentials.';
		return;
	}
	var o = await getOptions();
	o.habiticaUserId = userId;
	o.habiticaApiToken = apiToken;
	await saveOptions(o);
	showHabiticaTasksView();
	renderHabiticaTasks(result.tasks);
}

async function onHabiticaDisconnect() {
	var o = await getOptions();
	delete o.habiticaUserId;
	delete o.habiticaApiToken;
	await saveOptions(o);
	document.getElementById('habitica-user-id').value = '';
	document.getElementById('habitica-api-token').value = '';
	document.getElementById('habitica-error').textContent = '';
	showHabiticaForm();
}

async function fetchHabiticaTasks(userId, apiToken) {
	var listEl = document.getElementById('habitica-tasks-list');
	listEl.innerHTML = '<div class="habitica-loading">Loading tasks...</div>';
	var result = await fetchHabiticaTasksData(userId, apiToken);
	if (!result.ok) {
		listEl.innerHTML = `<div class="habitica-error-inline">${result.error || 'Failed to load tasks.'}</div>`;
		return;
	}
	renderHabiticaTasks(result.tasks);
}

async function fetchHabiticaTasksData(userId, apiToken) {
	try {
		var resp = await fetch('https://habitica.com/api/v3/tasks/user?type=todos', {
			headers: {
				'x-api-user': userId,
				'x-api-key': apiToken,
				'x-client': userId + '-' + HABITICA_APP_ID
			}
		});
		if (resp.status === 401) return {ok: false, error: 'Invalid credentials.'};
		if (!resp.ok) return {ok: false, error: 'API error: ' + resp.status};
		var json = await resp.json();
		return {ok: true, tasks: json.data || []};
	} catch (e) {
		return {ok: false, error: 'Network error. Check your connection.'};
	}
}

function renderHabiticaTasks(tasks) {
	var listEl = document.getElementById('habitica-tasks-list');
	var countEl = document.getElementById('habitica-tasks-count');
	var typeOrder = ['todo', 'daily', 'habit', 'reward'];
	var sorted = tasks.slice().sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type));
	countEl.textContent = tasks.length + ' task' + (tasks.length !== 1 ? 's' : '');
	if (!sorted.length) {
		listEl.innerHTML = '<div class="habitica-empty">No tasks found.</div>';
		return;
	}
	listEl.innerHTML = '';
	var currentType = null;
	sorted.forEach(task => {
		if (task.type !== currentType) {
			currentType = task.type;
			var header = document.createElement('div');
			header.className = 'habitica-type-header';
			header.textContent = task.type.charAt(0).toUpperCase() + task.type.slice(1) + 's';
			listEl.appendChild(header);
		}
		var item = document.createElement('div');
		item.className = 'habitica-task-item habitica-task-' + task.type;
		item.setAttribute('data-task-id', task.id);
		item.title = 'Click to start Pomodoro';
		item.style.cursor = 'pointer';
		if (task.type === 'daily' && task.isDue === false) item.classList.add('habitica-task-done');
		var title = document.createElement('span');
		title.className = 'habitica-task-text';
		title.textContent = task.text;
		item.appendChild(title);
		if (task.notes) {
			var notes = document.createElement('span');
			notes.className = 'habitica-task-notes';
			notes.textContent = task.notes;
			item.appendChild(notes);
		}
		item.addEventListener('click', _ => openPomodoro(task.id, task.text));
		listEl.appendChild(item);
	});
	initPomodoroBar();
}

function showHabiticaForm() {
	document.getElementById('habitica-credentials-form').classList.remove('hidden');
	document.getElementById('habitica-tasks-view').classList.add('hidden');
}

function showHabiticaTasksView() {
	document.getElementById('habitica-credentials-form').classList.add('hidden');
	document.getElementById('habitica-tasks-view').classList.remove('hidden');
}

// --- Clock ---

function startClock() {
	var el = document.getElementById('popup-clock');
	var tick = _ => { el.textContent = dayjs().format('HH:mm'); };
	tick();
	setInterval(tick, 1000);
}

// --- Pomodoro (inline bar in Habitica panel, kept for backward compat) ---

var pomodoroState = {taskId: null, taskText: '', seconds: 25 * 60, running: false, interval: null};

function initPomodoroBar() {
	document.getElementById('pomodoro-start-btn').addEventListener('click', togglePomodoro);
	document.getElementById('pomodoro-reset-btn').addEventListener('click', resetPomodoro);
	document.getElementById('pomodoro-close-btn').addEventListener('click', closePomodoro);
}

function openPomodoro(taskId, taskText) {
	if (pomodoroState.taskId !== taskId) {
		resetPomodoro();
		pomodoroState.taskId = taskId;
		pomodoroState.taskText = taskText;
		pomodoroState.seconds = 25 * 60;
	}
	document.getElementById('pomodoro-task-label').textContent = taskText;
	document.getElementById('pomodoro-time').textContent = formatPomodoroTime(pomodoroState.seconds);
	document.getElementById('pomodoro-time').classList.remove('done');
	document.getElementById('pomodoro-bar').classList.remove('hidden');
	document.querySelectorAll('.habitica-task-item').forEach(el => el.classList.remove('pomodoro-active'));
	var activeItem = document.querySelector(`.habitica-task-item[data-task-id="${taskId}"]`);
	if (activeItem) activeItem.classList.add('pomodoro-active');
}

function togglePomodoro() {
	if (pomodoroState.running) {
		clearInterval(pomodoroState.interval);
		pomodoroState.running = false;
		document.getElementById('pomodoro-start-btn').textContent = '▶';
	} else {
		pomodoroState.running = true;
		document.getElementById('pomodoro-start-btn').textContent = '⏸';
		pomodoroState.interval = setInterval(_ => {
			pomodoroState.seconds--;
			document.getElementById('pomodoro-time').textContent = formatPomodoroTime(pomodoroState.seconds);
			if (pomodoroState.seconds <= 0) {
				clearInterval(pomodoroState.interval);
				pomodoroState.running = false;
				document.getElementById('pomodoro-start-btn').textContent = '▶';
				document.getElementById('pomodoro-time').textContent = 'Done!';
				document.getElementById('pomodoro-time').classList.add('done');
				chrome.notifications && chrome.notifications.create('pomodoro-done', {
					type: 'basic',
					iconUrl: chrome.runtime.getURL('icons/logo-128.png'),
					title: 'Pomodoro done!',
					message: pomodoroState.taskText
				});
			}
		}, 1000);
	}
}

function resetPomodoro() {
	clearInterval(pomodoroState.interval);
	pomodoroState.running = false;
	pomodoroState.seconds = 25 * 60;
	document.getElementById('pomodoro-start-btn').textContent = '▶';
	document.getElementById('pomodoro-time').textContent = formatPomodoroTime(pomodoroState.seconds);
	document.getElementById('pomodoro-time').classList.remove('done');
}

function closePomodoro() {
	clearInterval(pomodoroState.interval);
	pomodoroState.running = false;
	pomodoroState.taskId = null;
	document.getElementById('pomodoro-bar').classList.add('hidden');
	document.querySelectorAll('.habitica-task-item').forEach(el => el.classList.remove('pomodoro-active'));
}

var formatPomodoroTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// --- Pomodoro Panel (full tab) ---

var POMO_DURATION = 25 * 60;
var pomoPanel = {
	taskId: null, taskText: '', seconds: POMO_DURATION,
	running: false, interval: null, initialized: false
};

async function getPomoStats() {
	var p = await new Promise(r => chrome.storage.local.get('pomoStats', r));
	return p.pomoStats || {done: 0, failed: 0};
}
async function savePomoStats(s) {
	return new Promise(r => chrome.storage.local.set({pomoStats: s}, r));
}

async function initPomoPanel() {
	if (pomoPanel.initialized) return;
	pomoPanel.initialized = true;

	document.getElementById('pomo-start-btn').addEventListener('click', pomoPanelToggle);
	document.getElementById('pomo-reset-btn').addEventListener('click', pomoPanelReset);

	document.getElementById('pomo-modal-done').addEventListener('click', _ => pomoPanelFinish('done'));
	document.getElementById('pomo-modal-fail').addEventListener('click', _ => pomoPanelFinish('failed'));
	document.getElementById('pomo-modal-relaunch').addEventListener('click', _ => {
		document.getElementById('pomo-modal').classList.add('hidden');
		pomoPanelReset();
		pomoPanelToggle();
	});
	document.getElementById('pomo-modal-postpone').addEventListener('click', _ => {
		document.getElementById('pomo-modal').classList.add('hidden');
		pomoPanel.seconds = 5 * 60;
		pomoPanelUpdateDisplay();
		pomoPanelToggle();
	});

	await pomoPanelRefreshStats();
	populatePomoPanelTasks();
}

async function pomoPanelFinish(result) {
	document.getElementById('pomo-modal').classList.add('hidden');
	var stats = await getPomoStats();
	stats[result] = (stats[result] || 0) + 1;
	await savePomoStats(stats);
	await pomoPanelRefreshStats();
	pomoPanelReset();
}

async function pomoPanelRefreshStats() {
	var s = await getPomoStats();
	document.getElementById('pomo-stat-done').textContent = `🥫 ${s.done || 0}`;
	document.getElementById('pomo-stat-fail').textContent = `☠️ ${s.failed || 0}`;
}

function pomoPanelToggle() {
	if (pomoPanel.running) {
		clearInterval(pomoPanel.interval);
		pomoPanel.running = false;
		document.getElementById('pomo-start-btn').textContent = 'Start';
	} else {
		if (!pomoPanel.taskId) {
			document.getElementById('pomo-selected-task').style.color = '#DF4E76';
			document.getElementById('pomo-selected-task').textContent = 'Pick a task first!';
			return;
		}
		pomoPanel.running = true;
		document.getElementById('pomo-start-btn').textContent = 'Pause';
		var total = pomoPanel.seconds;
		var circumference = 326.7;
		pomoPanel.interval = setInterval(_ => {
			pomoPanel.seconds--;
			pomoPanelUpdateDisplay();
			var progress = pomoPanel.seconds / total;
			document.getElementById('pomo-ring-fg').style.strokeDashoffset = circumference * (1 - progress);
			if (pomoPanel.seconds <= 0) {
				clearInterval(pomoPanel.interval);
				pomoPanel.running = false;
				document.getElementById('pomo-start-btn').textContent = 'Start';
				pomoPanelOnFinish();
			}
		}, 1000);
	}
}

function pomoPanelReset() {
	clearInterval(pomoPanel.interval);
	pomoPanel.running = false;
	pomoPanel.seconds = POMO_DURATION;
	document.getElementById('pomo-start-btn').textContent = 'Start';
	document.getElementById('pomo-ring-fg').style.strokeDashoffset = 0;
	pomoPanelUpdateDisplay();
}

function pomoPanelUpdateDisplay() {
	document.getElementById('pomo-time-display').textContent = formatPomodoroTime(pomoPanel.seconds);
}

function pomoPanelOnFinish() {
	try { new Audio(chrome.runtime.getURL('sounds/appointed.mp3')).play(); } catch(e) {}
	chrome.notifications && chrome.notifications.create('pomo-panel-done', {
		type: 'basic',
		iconUrl: chrome.runtime.getURL('icons/logo-128.png'),
		title: '🍅 Pomodoro done!',
		message: pomoPanel.taskText
	});
	document.getElementById('pomo-modal-task').textContent = pomoPanel.taskText;
	document.getElementById('pomo-modal').classList.remove('hidden');
}

function populatePomoPanelTasks() {
	var listEl = document.getElementById('pomo-task-list');
	var taskItems = document.querySelectorAll('.habitica-task-item[data-task-id]');
	if (!taskItems.length) {
		listEl.innerHTML = '<div class="pomo-empty">No Habitica tasks loaded. Go to Habitica tab first.</div>';
		return;
	}
	listEl.innerHTML = '';
	taskItems.forEach(item => {
		var id = item.getAttribute('data-task-id');
		var text = item.querySelector('.habitica-task-text') ? item.querySelector('.habitica-task-text').textContent : id;
		var type = item.className.match(/habitica-task-(\w+)/);
		type = type ? type[1] : '';

		var row = document.createElement('div');
		row.className = 'pomo-task-row';
		if (pomoPanel.taskId === id) row.classList.add('selected');

		var badge = document.createElement('span');
		badge.className = 'pomo-task-type-badge';
		badge.textContent = type;

		var label = document.createElement('span');
		label.textContent = text;

		row.append(badge, label);
		row.addEventListener('click', _ => {
			pomoPanel.taskId = id;
			pomoPanel.taskText = text;
			document.querySelectorAll('.pomo-task-row').forEach(r => r.classList.remove('selected'));
			row.classList.add('selected');
			document.getElementById('pomo-selected-task').textContent = text;
			document.getElementById('pomo-selected-task').style.color = '';
			pomoPanelReset();
		});
		listEl.appendChild(row);
	});
}

// --- Google Calendar ---

var GCAL_CLIENT_ID = '232211191249-b5dv27oncbka7epqsl7eclmfqno0tsk1.apps.googleusercontent.com';
var GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
var calToken = null;
var calPanelInitialized = false;

async function getStoredCalToken() {
	var p = await new Promise(r => chrome.storage.local.get('gcalToken', r));
	return p.gcalToken || null;
}
async function storeCalToken(token) {
	return new Promise(r => chrome.storage.local.set({gcalToken: token}, r));
}
async function clearCalToken() {
	calToken = null;
	return new Promise(r => chrome.storage.local.remove('gcalToken', r));
}

async function initCalendarPanel() {
	if (calPanelInitialized) {
		if (calToken) fetchCalendarEvents();
		return;
	}
	calPanelInitialized = true;

	document.getElementById('cal-auth-btn').addEventListener('click', calAuth);
	document.getElementById('cal-refresh-btn').addEventListener('click', fetchCalendarEvents);
	document.getElementById('cal-signout-btn').addEventListener('click', calSignOut);

	calToken = await getStoredCalToken();
	if (calToken) {
		showCalConnected();
		fetchCalendarEvents();
	}
}

async function calAuth() {
	var redirectURL = chrome.identity.getRedirectURL();
	var authURL = 'https://accounts.google.com/o/oauth2/auth' +
		'?client_id=' + encodeURIComponent(GCAL_CLIENT_ID) +
		'&response_type=token' +
		'&redirect_uri=' + encodeURIComponent(redirectURL) +
		'&scope=' + encodeURIComponent(GCAL_SCOPE);

	try {
		var responseUrl = await new Promise((resolve, reject) =>
			chrome.identity.launchWebAuthFlow({url: authURL, interactive: true}, url => {
				if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
				else resolve(url);
			})
		);
		var params = new URLSearchParams(new URL(responseUrl).hash.slice(1));
		calToken = params.get('access_token');
		if (!calToken) throw new Error('No token');
		await storeCalToken(calToken);
		showCalConnected();
		fetchCalendarEvents();
	} catch(e) {
		document.getElementById('cal-events-list').innerHTML = '<div class="cal-error">Auth failed: ' + (e.message || e) + '</div>';
	}
}

function showCalConnected() {
	document.getElementById('cal-auth-btn').classList.add('hidden');
	document.getElementById('cal-refresh-btn').classList.remove('hidden');
	document.getElementById('cal-signout-btn').classList.remove('hidden');
}

async function calSignOut() {
	await clearCalToken();
	calPanelInitialized = false;
	document.getElementById('cal-auth-btn').classList.remove('hidden');
	document.getElementById('cal-refresh-btn').classList.add('hidden');
	document.getElementById('cal-signout-btn').classList.add('hidden');
	document.getElementById('cal-events-list').innerHTML = '<div class="cal-empty">Connect your Google Calendar to see today\'s events.</div>';
}

async function fetchCalendarEvents() {
	var listEl = document.getElementById('cal-events-list');
	listEl.innerHTML = '<div class="cal-loading">Loading events...</div>';

	var now = dayjs();
	var todayStart = now.startOf('day').toISOString();
	var todayEnd = now.endOf('day').toISOString();

	try {
		var resp = await fetch(
			`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(todayStart)}&timeMax=${encodeURIComponent(todayEnd)}&singleEvents=true&orderBy=startTime&maxResults=50`,
			{headers: {Authorization: 'Bearer ' + calToken}}
		);
		if (resp.status === 401) {
			await clearCalToken();
			showCalDisconnected();
			listEl.innerHTML = '<div class="cal-error">Session expired. Please reconnect.</div>';
			return;
		}
		if (!resp.ok) {
			listEl.innerHTML = '<div class="cal-error">API error: ' + resp.status + '</div>';
			return;
		}
		var json = await resp.json();
		renderCalEvents(json.items || []);
	} catch(e) {
		listEl.innerHTML = '<div class="cal-error">Network error. Check your connection.</div>';
	}
}

function showCalDisconnected() {
	document.getElementById('cal-auth-btn').classList.remove('hidden');
	document.getElementById('cal-refresh-btn').classList.add('hidden');
	document.getElementById('cal-signout-btn').classList.add('hidden');
	calToken = null;
}

function renderCalEvents(events) {
	var listEl = document.getElementById('cal-events-list');
	if (!events.length) {
		listEl.innerHTML = '<div class="cal-empty">No events today. Enjoy your free day!</div>';
		return;
	}
	listEl.innerHTML = '';
	var header = document.createElement('div');
	header.className = 'cal-date-header';
	header.textContent = dayjs().format('dddd, MMMM D');
	listEl.appendChild(header);

	events.forEach(ev => {
		var item = document.createElement('div');
		item.className = 'cal-event-item';

		var dot = document.createElement('div');
		dot.className = 'cal-event-dot';
		var color = ev.colorId ? calEventColor(ev.colorId) : '#4285F4';
		dot.style.background = color;

		var timeEl = document.createElement('div');
		timeEl.className = 'cal-event-time';
		var isAllDay = !!(ev.start && ev.start.date && !ev.start.dateTime);
		if (isAllDay) {
			timeEl.textContent = 'All day';
			timeEl.classList.add('allday');
		} else {
			var start = dayjs(ev.start.dateTime);
			var end = dayjs(ev.end.dateTime);
			timeEl.textContent = start.format(getHourFormat(start.minute() !== 0)) + '\n' + end.format(getHourFormat(end.minute() !== 0));
		}

		var body = document.createElement('div');
		body.className = 'cal-event-body';

		var title = document.createElement('div');
		title.className = 'cal-event-title';
		title.textContent = ev.summary || '(No title)';
		body.appendChild(title);

		if (ev.location) {
			var loc = document.createElement('div');
			loc.className = 'cal-event-loc';
			loc.textContent = '📍 ' + ev.location;
			body.appendChild(loc);
		}

		item.append(dot, timeEl, body);
		listEl.appendChild(item);
	});
}

function calEventColor(colorId) {
	var colors = {
		'1':'#a4bdfc','2':'#7ae7bf','3':'#dbadff','4':'#ff887c',
		'5':'#fbd75b','6':'#ffb878','7':'#46d6db','8':'#e1e1e1',
		'9':'#5484ed','10':'#51b749','11':'#dc2127'
	};
	return colors[colorId] || '#4285F4';
}

// --- Bookmarks ---

async function getBookmarks() {
	var p = await new Promise(r => chrome.storage.local.get('snoozeBookmarks', r));
	return (p && p.snoozeBookmarks) || [];
}

async function saveBookmarks(list) {
	return new Promise(r => chrome.storage.local.set({snoozeBookmarks: list}, r));
}

async function initBookmarks() {
	renderBookmarks();
	document.getElementById('bookmark-add-btn').addEventListener('click', async _ => {
		var bm = await getBookmarks();
		if (bm.length >= 10) {
			alert('You already have 10 bookmarks. Remove one first.');
			return;
		}
		var tab = await getTabsInWindow(true);
		if (!tab || !tab.url || !isValid(tab)) return;
		if (bm.some(b => b.url === tab.url)) return;
		bm.push({url: tab.url, title: tab.title || tab.url, favicon: tab.favIconUrl || ''});
		await saveBookmarks(bm);
		renderBookmarks();
	});
}

async function renderBookmarks() {
	var list = document.getElementById('bookmarks-list');
	var bm = await getBookmarks();
	list.innerHTML = '';
	if (!bm.length) {
		list.innerHTML = '<div class="bookmarks-empty">No bookmarks yet. Add the current tab above.</div>';
		return;
	}
	bm.forEach((b, i) => {
		var item = document.createElement('div');
		item.className = 'bookmark-item';

		var num = document.createElement('span');
		num.className = 'bookmark-num';
		num.textContent = i === 9 ? '0' : String(i + 1);

		var favicon = document.createElement('img');
		favicon.className = 'bookmark-favicon';
		favicon.src = b.favicon || getFaviconUrl(b.url);
		favicon.onerror = _ => { favicon.src = '../icons/unknown.png'; };

		var title = document.createElement('span');
		title.className = 'bookmark-title';
		title.textContent = b.title;

		var url = document.createElement('span');
		url.className = 'bookmark-url';
		url.textContent = getHostname(b.url) || b.url;

		var remove = document.createElement('span');
		remove.className = 'bookmark-remove';
		remove.textContent = '×';
		remove.title = 'Remove';
		remove.addEventListener('click', async e => {
			e.stopPropagation();
			var updated = (await getBookmarks()).filter((_, j) => j !== i);
			await saveBookmarks(updated);
			renderBookmarks();
		});

		item.addEventListener('click', _ => {
			chrome.tabs.create({url: b.url, active: true});
			setTimeout(_ => window.close(), 100);
		});

		item.append(num, favicon, title, url, remove);
		list.appendChild(item);
	});
}

window.onload = init
