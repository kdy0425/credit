document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.js_admin_login')?.addEventListener('submit', (event) => event.preventDefault());
    initAdminNavigation();
    initAdminDatepickers();
    initReviewTableSortButtons();
    initAdminModals();
    initAdminFileInputs();
    initAdminPasswordToggles();
});

function initAdminPasswordToggles() {
    document.querySelectorAll('[data-admin-password-toggle]').forEach((button) => {
        const input = document.getElementById(button.dataset.adminPasswordToggle);
        const eyeOpen = button.querySelector('[data-eye-open]');
        const eyeClosed = button.querySelector('[data-eye-closed]');
        if (!input || !eyeOpen || !eyeClosed) return;

        const updatePasswordState = (isVisible) => {
            input.type = isVisible ? 'text' : 'password';
            eyeOpen.style.display = isVisible ? 'none' : '';
            eyeClosed.style.display = isVisible ? '' : 'none';
            button.setAttribute('aria-pressed', String(isVisible));
            button.setAttribute('aria-label', isVisible ? '비밀번호 숨기기' : '비밀번호 표시');
        };

        updatePasswordState(input.type === 'text');
        button.addEventListener('click', () => updatePasswordState(input.type === 'password'));
    });
}

function initReviewTableSortButtons() {
    const nextState = { none: 'asc', asc: 'desc', desc: 'none' };
    const ariaState = { none: 'none', asc: 'ascending', desc: 'descending' };
    const stateText = { none: '정렬 없음', asc: '오름차순', desc: '내림차순' };

    document.querySelectorAll('.review_table').forEach((table) => {
        const buttons = [...table.querySelectorAll('.table_sort')];
        if (!buttons.length) return;

        const updateButton = (button, state) => {
            const th = button.closest('th');
            const label = button.textContent.replace(/\s+/g, ' ').trim();
            button.dataset.sortState = state;
            button.setAttribute(
                'aria-label',
                `${label}: ${stateText[state]}. 클릭하면 ${stateText[nextState[state]]}`
            );
            th?.setAttribute('aria-sort', ariaState[state]);
        };

        buttons.forEach((button) => {
            updateButton(button, button.dataset.sortState || 'none');

            button.addEventListener('click', () => {
                const state = nextState[button.dataset.sortState || 'none'];
                buttons.forEach((item) => updateButton(item, item === button ? state : 'none'));
            });
        });
    });
}

function initAdminNavigation() {
    document.querySelectorAll('.admin_nav_title').forEach((title, index) => {
        const group = title.closest('.admin_nav_group');
        const submenu = group?.querySelector('.admin_nav_sub');
        if (!submenu) return;

        if (!submenu.id) submenu.id = `admin-nav-sub-${index + 1}`;
        title.setAttribute('role', 'button');
        title.setAttribute('tabindex', '0');
        title.setAttribute('aria-controls', submenu.id);

        const setExpanded = (expanded) => {
            const expandedHeight = [...submenu.children]
                .reduce((height, item) => height + item.scrollHeight, 0) + 16;
            title.classList.toggle('is-collapsed', !expanded);
            title.setAttribute('aria-expanded', String(expanded));
            submenu.classList.toggle('is-collapsed', !expanded);
            submenu.setAttribute('aria-hidden', String(!expanded));
            submenu.style.maxHeight = expanded ? `${expandedHeight}px` : '0px';
            submenu.querySelectorAll('a').forEach((link) => {
                if (expanded) link.removeAttribute('tabindex');
                else link.setAttribute('tabindex', '-1');
            });
        };

        const toggleSubmenu = () => setExpanded(title.getAttribute('aria-expanded') !== 'true');

        title.addEventListener('click', toggleSubmenu);
        title.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            toggleSubmenu();
        });

        setExpanded(!title.classList.contains('is-collapsed'));
    });
}

function initAdminDatepickers() {
    if (typeof window.flatpickr !== 'function') return;

    const locale = window.flatpickr.l10ns?.ko || 'default';
    const dateRanges = [];
    const periodPresets = {
        '1일': { days: 1 },
        '2주': { days: 14 },
        '1개월': { months: 1 },
        '3개월': { months: 3 },
        '6개월': { months: 6 }
    };

    const syncYearSelect = (instance) => {
        if (instance._yearSelect) instance._yearSelect.value = String(instance.currentYear);
    };

    const createYearSelect = (instance) => {
        const yearInput = instance.currentYearElement;
        const yearWrapper = yearInput?.closest('.numInputWrapper');
        if (!yearWrapper) return;

        const yearSelect = document.createElement('select');
        const currentYear = new Date().getFullYear();
        const minYear = instance.config.minDate?.getFullYear() || 1900;
        const maxYear = instance.config.maxDate?.getFullYear() || currentYear + 20;

        yearSelect.className = 'flatpickr-year-select';
        yearSelect.setAttribute('aria-label', '연도 선택');

        for (let year = maxYear; year >= minYear; year -= 1) {
            const option = document.createElement('option');
            option.value = String(year);
            option.textContent = `${year}년`;
            yearSelect.appendChild(option);
        }

        yearSelect.value = String(instance.currentYear);
        yearSelect.addEventListener('change', () => instance.changeYear(Number(yearSelect.value)));
        yearWrapper.replaceWith(yearSelect);
        instance._yearSelect = yearSelect;
    };

    const getPeriodStartDate = (endDate, preset) => {
        const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

        if (preset.days) {
            startDate.setDate(startDate.getDate() - (preset.days - 1));
            return startDate;
        }

        const originalDay = startDate.getDate();
        const targetMonth = new Date(startDate.getFullYear(), startDate.getMonth() - preset.months, 1);
        const targetMonthLastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
        targetMonth.setDate(Math.min(originalDay, targetMonthLastDay));
        targetMonth.setDate(targetMonth.getDate() + 1);
        return targetMonth;
    };

    const baseOptions = {
        locale,
        dateFormat: 'Y-m-d',
        ariaDateFormat: 'Y년 m월 d일',
        allowInput: true,
        disableMobile: true,
        monthSelectorType: 'dropdown',
        onReady: (_dates, _dateString, instance) => {
            instance.calendarContainer
                .querySelector('.flatpickr-monthDropdown-months')
                ?.setAttribute('aria-label', '월 선택');
            createYearSelect(instance);
        },
        onMonthChange: (_dates, _dateString, instance) => syncYearSelect(instance),
        onYearChange: (_dates, _dateString, instance) => syncYearSelect(instance),
        onValueUpdate: (_dates, _dateString, instance) => syncYearSelect(instance)
    };

    document.querySelectorAll('.date_filter').forEach((dateFilter) => {
        const inputs = [...dateFilter.querySelectorAll('.js_datepicker')];
        if (!inputs.length) return;

        if (inputs.length < 2) {
            window.flatpickr(inputs[0], baseOptions);
            return;
        }

        let endPicker;
        const startPicker = window.flatpickr(inputs[0], {
            ...baseOptions,
            onChange: (dates) => endPicker?.set('minDate', dates[0] || null)
        });
        endPicker = window.flatpickr(inputs[1], {
            ...baseOptions,
            onChange: (dates) => startPicker.set('maxDate', dates[0] || null)
        });

        const syncRange = () => {
            startPicker.set('maxDate', endPicker.selectedDates[0] || null);
            endPicker.set('minDate', startPicker.selectedDates[0] || null);
        };

        const periodButtons = [...dateFilter.querySelectorAll('.period_buttons button')];
        const defaultActiveButton = periodButtons.find((button) => button.classList.contains('active'));
        const applyPeriod = (button, endDate) => {
            const preset = periodPresets[button?.textContent.trim()];
            if (!preset) return;

            const startDate = getPeriodStartDate(endDate, preset);

            startPicker.set('maxDate', null);
            endPicker.set('minDate', null);
            startPicker.setDate(startDate, false);
            endPicker.setDate(endDate, false);
            syncRange();

            periodButtons.forEach((item) => item.classList.toggle('active', item === button));
        };

        periodButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const endDate = endPicker.selectedDates[0] || window.flatpickr.parseDate(inputs[1].value, 'Y-m-d') || new Date();
                applyPeriod(button, endDate);
            });
        });

        const resetRange = () => {
            if (defaultActiveButton) applyPeriod(defaultActiveButton, new Date());
            else {
                endPicker.setDate(new Date(), false);
                syncRange();
            }
        };

        resetRange();
        dateRanges.push({ dateFilter, resetRange });
    });

    document.querySelectorAll('form').forEach((form) => {
        if (!form.querySelector('.js_datepicker')) return;
        form.addEventListener('reset', () => {
            requestAnimationFrame(() => {
                form.querySelectorAll('.js_datepicker').forEach((input) => {
                    input._flatpickr?.setDate(input.defaultValue, false, 'Y-m-d');
                });
                dateRanges
                    .filter(({ dateFilter }) => form.contains(dateFilter))
                    .forEach(({ resetRange }) => resetRange());
            });
        });
    });
}

let adminAlertElements = null;
let adminAlertState = null;
let activeStaticModal = null;
let adminModalTrigger = null;

function getAdminAlertElements() {
    if (adminAlertElements) return adminAlertElements;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal_backdrop alert_modal_backdrop';
    backdrop.dataset.alertModal = '';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = `
        <section class="alert_modal" role="alertdialog" aria-modal="true" aria-labelledby="alert-modal-title" aria-describedby="alert-modal-message">
            <button type="button" class="modal_close" aria-label="닫기">×</button>
            <h2 class="alert_modal_title" id="alert-modal-title">
                <span data-alert-title>알림</span>
            </h2>
            <p class="alert_modal_message" id="alert-modal-message" data-alert-message></p>
            <div class="modal_buttons" data-alert-buttons>
                <button type="button" class="button outline" data-alert-cancel></button>
                <button type="button" class="button dark" data-alert-confirm></button>
            </div>
        </section>
    `;
    document.body.appendChild(backdrop);

    adminAlertElements = {
        backdrop,
        dialog: backdrop.querySelector('.alert_modal'),
        closeButton: backdrop.querySelector('.modal_close'),
        title: backdrop.querySelector('[data-alert-title]'),
        message: backdrop.querySelector('[data-alert-message]'),
        buttons: backdrop.querySelector('[data-alert-buttons]'),
        cancelButton: backdrop.querySelector('[data-alert-cancel]'),
        confirmButton: backdrop.querySelector('[data-alert-confirm]')
    };

    adminAlertElements.closeButton.addEventListener('click', () => runAdminAlertAction(false));
    adminAlertElements.cancelButton.addEventListener('click', () => runAdminAlertAction(false));
    adminAlertElements.confirmButton.addEventListener('click', () => runAdminAlertAction(true));
    backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop && adminAlertState?.config.closeOnBackdrop) runAdminAlertAction(false);
    });

    return adminAlertElements;
}

function normalizeAdminAlertConfig(args) {
    const defaults = {
        type: 'danger',
        title: '알림',
        message: '',
        cancelText: '',
        confirmText: '확인',
        confirmStyle: 'primary',
        closeOnBackdrop: true,
        onConfirm: null,
        onCancel: null
    };

    if (typeof args[0] === 'object' && args[0] !== null) return { ...defaults, ...args[0] };

    const [type, message, thirdText, fourthValue, fifthValue] = args;
    const hasCancelButton = typeof fourthValue === 'string';
    const optionValue = hasCancelButton ? fifthValue : fourthValue;
    const options = typeof optionValue === 'function' ? { onConfirm: optionValue } : (optionValue || {});

    return {
        ...defaults,
        ...options,
        type: type || defaults.type,
        message: message || '',
        cancelText: hasCancelButton ? (thirdText || '') : '',
        confirmText: hasCancelButton ? (fourthValue || defaults.confirmText) : (thirdText || defaults.confirmText)
    };
}

function setAdminAlertBusy(isBusy) {
    const elements = getAdminAlertElements();
    elements.closeButton.disabled = isBusy;
    elements.cancelButton.disabled = isBusy;
    elements.confirmButton.disabled = isBusy;
}

function completeAdminAlert(confirmed, error) {
    if (!adminAlertState) return;

    const elements = getAdminAlertElements();
    const state = adminAlertState;
    adminAlertState = null;
    elements.backdrop.classList.remove('open');
    elements.backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = state.bodyOverflow;
    state.previousFocus?.focus?.();

    if (error) state.reject(error);
    else state.resolve(confirmed);
}

async function runAdminAlertAction(confirmed) {
    if (!adminAlertState || adminAlertState.busy) return;

    const state = adminAlertState;
    const callback = confirmed ? state.config.onConfirm : state.config.onCancel;
    state.busy = true;
    setAdminAlertBusy(true);

    try {
        const callbackResult = typeof callback === 'function' ? await callback() : undefined;
        if (callbackResult === false) {
            state.busy = false;
            setAdminAlertBusy(false);
            (confirmed ? getAdminAlertElements().confirmButton : getAdminAlertElements().cancelButton).focus();
            return;
        }
        completeAdminAlert(confirmed);
    } catch (error) {
        completeAdminAlert(false, error);
    }
}

function alertModal(...args) {
    const config = normalizeAdminAlertConfig(args);
    const elements = getAdminAlertElements();

    if (adminAlertState) completeAdminAlert(false);

    elements.dialog.dataset.type = config.type;
    elements.title.textContent = config.title;
    elements.message.textContent = config.message;
    elements.cancelButton.textContent = config.cancelText;
    elements.cancelButton.hidden = !config.cancelText;
    elements.confirmButton.textContent = config.confirmText;
    elements.confirmButton.className = config.confirmStyle === 'danger' ? 'button modal_danger' : 'button dark';
    elements.buttons.classList.toggle('is_single', !config.cancelText);
    setAdminAlertBusy(false);

    return new Promise((resolve, reject) => {
        adminAlertState = {
            config,
            resolve,
            reject,
            busy: false,
            previousFocus: document.activeElement,
            bodyOverflow: document.body.style.overflow
        };
        document.body.style.overflow = 'hidden';
        elements.backdrop.classList.add('open');
        elements.backdrop.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => elements.confirmButton.focus());
    });
}

function modalShow(selector, documentName) {
    const backdrop = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!backdrop?.classList.contains('admin_modal_backdrop')) return;

    if (activeStaticModal && activeStaticModal !== backdrop) modalHide(activeStaticModal);

    adminModalTrigger = document.activeElement;
    activeStaticModal = backdrop;

    if (documentName) {
        backdrop.querySelectorAll('[data-modal-document]').forEach((target) => {
            target.textContent = documentName;
        });
        backdrop.querySelectorAll('[data-review-documents]').forEach((target) => {
            const documentText = `${documentName} - 잘못된 서류 첨부`;
            if (target.matches('ul, ol')) {
                const item = document.createElement('li');
                item.textContent = documentText;
                target.replaceChildren(item);
                return;
            }
            target.textContent = documentText;
        });
    }

    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
        backdrop.querySelector('.admin_modal_close, button, [href], input, select, textarea')?.focus();
    });
}

function modalHide(target) {
    const backdrop = typeof target === 'string'
        ? document.querySelector(target)
        : target?.classList?.contains('admin_modal_backdrop')
            ? target
            : target?.closest?.('.admin_modal_backdrop');

    if (!backdrop) return;

    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    if (activeStaticModal === backdrop) activeStaticModal = null;
    document.body.style.overflow = '';
    adminModalTrigger?.focus?.();
    adminModalTrigger = null;
}

function initAdminModals() {
    document.querySelectorAll('.admin_modal_backdrop').forEach((backdrop) => {
        backdrop.addEventListener('mousedown', (event) => {
            if (event.target === backdrop) modalHide(backdrop);
        });
    });
}

function initAdminFileInputs() {
    document.querySelectorAll('.file_native').forEach((fileInput) => {
        const group = fileInput.closest('.input_group');
        const fileArea = group?.querySelector('.file_input');
        const fileNameInput = fileArea?.querySelector('.modal_input');
        const removeButton = fileArea?.querySelector('.file_remove');
        if (!group || !fileArea || !fileNameInput || !removeButton) return;

        const updateFileState = (fileName = '') => {
            fileNameInput.value = fileName;
            fileArea.classList.toggle('has_file', Boolean(fileName));
        };

        fileInput.addEventListener('change', () => {
            updateFileState(fileInput.files?.[0]?.name || '');
        });

        removeButton.addEventListener('click', () => {
            fileInput.value = '';
            updateFileState();
        });

        updateFileState(fileNameInput.value);
    });
}

function switchReviewTab(button, panelId) {
    const tabList = button.closest('.segment_tabs');
    const section = tabList?.parentElement;
    tabList?.querySelectorAll('button').forEach((item) => {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
    });
    section?.querySelectorAll('.tab_panel').forEach((panel) => panel.classList.remove('active'));
    button.classList.add('active');
    button.setAttribute('aria-selected', 'true');
    document.getElementById(panelId)?.classList.add('active');
}

function scrollToReviewTabs(button) {
    button.closest('.segment_tabs')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function toggleExclusiveAccordion(button) {
    const panelId = button.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(willOpen));
    button.closest('.exclusive_accordion')?.classList.toggle('open', willOpen);
    panel.hidden = !willOpen;
}

let activeReviewMenuTrigger = null;

function reviewMenuHide() {
    document.querySelectorAll('.review_menu').forEach((menu) => {
        menu.hidden = true;
        menu.classList.remove('open');
    });
    activeReviewMenuTrigger?.setAttribute('aria-expanded', 'false');
    activeReviewMenuTrigger = null;
}

function reviewMenuShow(trigger, selector) {
    const menu = document.querySelector(selector);
    if (!menu) return;

    const isSameOpen = activeReviewMenuTrigger === trigger && !menu.hidden;
    reviewMenuHide();
    if (isSameOpen) return;

    activeReviewMenuTrigger = trigger;
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    menu.classList.add('open');

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportGap = 12;
    const left = Math.min(
        window.innerWidth - menuRect.width - viewportGap,
        Math.max(viewportGap, triggerRect.right - menuRect.width)
    );
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const top = spaceBelow >= menuRect.height + 4
        ? triggerRect.bottom + 4
        : triggerRect.top - menuRect.height - 4;

    menu.style.left = `${left}px`;
    menu.style.top = `${Math.max(viewportGap, top)}px`;
    menu.querySelector('button')?.focus();
}

function reviewTableClick(event) {
    const trigger = event.target.closest('.table_plus, .process_action');
    if (!trigger) return;

    event.stopPropagation();
    const selector = trigger.dataset.reviewMenu || '#review-row-menu';
    reviewMenuShow(trigger, selector);
}

document.addEventListener('click', (event) => {
    if (!event.target.closest('.review_menu')) reviewMenuHide();
});

window.addEventListener('resize', reviewMenuHide);
window.addEventListener('scroll', reviewMenuHide, true);

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    reviewMenuHide();
    if (adminAlertState) runAdminAlertAction(false);
    if (activeStaticModal) modalHide(activeStaticModal);
});
