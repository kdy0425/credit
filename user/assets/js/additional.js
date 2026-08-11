(function () {
    class SelectBox {
        constructor(select) {
            this.select = select;
            this.root = document.createElement('div');
            this.root.className = 'selectbox';
            this.button = document.createElement('button');
            this.button.type = 'button';
            this.button.className = 'selectbox_button';
            this.button.setAttribute('aria-haspopup', 'listbox');
            this.button.setAttribute('aria-expanded', 'false');
            this.menu = document.createElement('div');
            this.menu.className = 'selectbox_menu';
            this.menu.setAttribute('role', 'listbox');
            select.parentNode.insertBefore(this.root, select);
            this.root.append(select, this.button, this.menu);
            this.render();
            this.button.addEventListener('click', () => {
                const isOpen = this.root.classList.toggle('open');
                this.button.setAttribute('aria-expanded', String(isOpen));
            });
            this.button.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                this.close();
            });
            select.addEventListener('change', () => this.render());
            select.form?.addEventListener('reset', () => setTimeout(() => this.render()));
            document.addEventListener('click', (event) => {
                if (!this.root.contains(event.target)) this.close();
            });
        }
        close() {
            this.root.classList.remove('open');
            this.button.setAttribute('aria-expanded', 'false');
        }
        render() {
            const options = [...this.select.options];
            this.button.textContent = options[this.select.selectedIndex]?.text || '선택';
            this.menu.innerHTML = '';
            options.forEach((option, index) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'selectbox_option' + (index === this.select.selectedIndex ? ' active' : '');
                item.textContent = option.text;
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', String(index === this.select.selectedIndex));
                item.addEventListener('click', () => {
                    this.select.selectedIndex = index;
                    this.select.dispatchEvent(new Event('change', { bubbles: true }));
                    this.close();
                });
                this.menu.append(item);
            });
        }
    }

    let alertModalElements = null;
    let alertModalState = null;

    const getAlertModalElements = () => {
        if (alertModalElements) return alertModalElements;

        const backdrop = document.createElement('div');
        backdrop.className = 'modal_backdrop alert_modal_backdrop';
        backdrop.dataset.alertModal = '';
        backdrop.setAttribute('aria-hidden', 'true');
        backdrop.innerHTML = `
            <section class="alert_modal" role="alertdialog" aria-modal="true" aria-labelledby="alert-modal-title" aria-describedby="alert-modal-message">
                <button type="button" class="modal_close" aria-label="닫기">×</button>
                <h2 class="alert_modal_title" id="alert-modal-title">
                    <span data-alert-title>알림</span>
                    <span class="modal_status_icon" data-alert-icon aria-hidden="true"></span>
                </h2>
                <p class="alert_modal_message" id="alert-modal-message" data-alert-message></p>
                <div class="modal_buttons" data-alert-buttons>
                    <button type="button" class="button" data-alert-cancel></button>
                    <button type="button" class="button primary" data-alert-confirm></button>
                </div>
            </section>
        `;
        document.body.append(backdrop);

        alertModalElements = {
            backdrop,
            dialog: backdrop.querySelector('.alert_modal'),
            closeButton: backdrop.querySelector('.modal_close'),
            title: backdrop.querySelector('[data-alert-title]'),
            icon: backdrop.querySelector('[data-alert-icon]'),
            message: backdrop.querySelector('[data-alert-message]'),
            buttons: backdrop.querySelector('[data-alert-buttons]'),
            cancelButton: backdrop.querySelector('[data-alert-cancel]'),
            confirmButton: backdrop.querySelector('[data-alert-confirm]'),
        };

        alertModalElements.closeButton.addEventListener('click', () => runAlertModalAction(false));
        alertModalElements.cancelButton.addEventListener('click', () => runAlertModalAction(false));
        alertModalElements.confirmButton.addEventListener('click', () => runAlertModalAction(true));
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop && alertModalState?.config.closeOnBackdrop) runAlertModalAction(false);
        });

        return alertModalElements;
    };

    const getAlertButtonClass = (style) => {
        const styleMap = {
            outline: '',
            white: '',
            primary: 'primary',
            navy: 'primary',
            blue: 'blue',
            danger: 'modal_danger',
            red: 'modal_danger',
        };

        return `button${styleMap[style] ? ` ${styleMap[style]}` : ''}`;
    };

    const normalizeAlertModalConfig = (args) => {
        const defaults = {
            type: 'danger',
            title: '알림',
            message: '',
            cancelText: '',
            confirmText: '확인',
            cancelStyle: 'outline',
            confirmStyle: 'primary',
            closeOnBackdrop: true,
            onConfirm: null,
            onCancel: null,
        };

        const normalizeType = (config) => {
            if (config.type === 'check') config.type = 'success';
            if (config.type === 'danger-red') {
                config.type = 'danger';
                config.confirmStyle = 'danger';
            }
            if (!['danger', 'success', 'none'].includes(config.type)) config.type = 'danger';

            return config;
        };

        if (typeof args[0] === 'object' && args[0] !== null) {
            return normalizeType({ ...defaults, ...args[0] });
        }

        const [type, message, thirdText, fourthValue, fifthValue] = args;
        const hasCancelButton = typeof fourthValue === 'string';
        const optionValue = hasCancelButton ? fifthValue : fourthValue;
        const options = typeof optionValue === 'function'
            ? { onConfirm: optionValue }
            : (optionValue || {});
        const config = {
            ...defaults,
            ...options,
            type: type || defaults.type,
            message: message || '',
            cancelText: hasCancelButton ? (thirdText || '') : '',
            confirmText: hasCancelButton ? (fourthValue || defaults.confirmText) : (thirdText || defaults.confirmText),
        };

        return normalizeType(config);
    };

    const completeAlertModal = (confirmed, error) => {
        if (!alertModalState) return;

        const elements = getAlertModalElements();
        const state = alertModalState;
        alertModalState = null;
        elements.backdrop.classList.remove('open');
        elements.backdrop.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = state.bodyOverflow;
        state.previousFocus?.focus?.();

        if (error) state.reject(error);
        else state.resolve(confirmed);
    };

    const setAlertModalBusy = (isBusy) => {
        const elements = getAlertModalElements();
        elements.closeButton.disabled = isBusy;
        elements.cancelButton.disabled = isBusy;
        elements.confirmButton.disabled = isBusy;
    };

    async function runAlertModalAction(confirmed) {
        if (!alertModalState || alertModalState.busy) return;

        const state = alertModalState;
        const callback = confirmed ? state.config.onConfirm : state.config.onCancel;
        state.busy = true;
        setAlertModalBusy(true);

        try {
            const callbackResult = typeof callback === 'function' ? await callback() : undefined;
            if (callbackResult === false) {
                state.busy = false;
                setAlertModalBusy(false);
                const elements = getAlertModalElements();
                (confirmed ? elements.confirmButton : elements.cancelButton).focus();
                return;
            }
            completeAlertModal(confirmed);
        } catch (error) {
            completeAlertModal(false, error);
        }
    }

    window.alertModal = (...args) => {
        const config = normalizeAlertModalConfig(args);
        const elements = getAlertModalElements();

        if (alertModalState) completeAlertModal(false);

        elements.dialog.dataset.type = config.type;
        elements.title.textContent = config.title;
        elements.message.textContent = config.message;
        elements.icon.className = `modal_status_icon ${config.type}`;
        elements.icon.hidden = config.type === 'none';
        elements.cancelButton.textContent = config.cancelText;
        elements.cancelButton.className = getAlertButtonClass(config.cancelStyle);
        elements.cancelButton.hidden = !config.cancelText;
        elements.confirmButton.textContent = config.confirmText;
        elements.confirmButton.className = getAlertButtonClass(config.confirmStyle);
        elements.buttons.classList.toggle('is_single', !config.cancelText);
        setAlertModalBusy(false);

        return new Promise((resolve, reject) => {
            alertModalState = {
                config,
                resolve,
                reject,
                busy: false,
                previousFocus: document.activeElement,
                bodyOverflow: document.body.style.overflow,
            };
            document.body.style.overflow = 'hidden';
            elements.backdrop.classList.add('open');
            elements.backdrop.setAttribute('aria-hidden', 'false');
            requestAnimationFrame(() => elements.confirmButton.focus());
        });
    };

    document.querySelectorAll('select[data-selectbox]').forEach((select) => new SelectBox(select));

    document.querySelectorAll('[data-modal-open]').forEach((button) => {
        button.addEventListener('click', () => {
            const modal = document.querySelector(button.dataset.modalOpen);
            modal?.classList.add('open');
            modal?.querySelector('button, [href], input, select, textarea')?.focus();
        });
    });
    document.querySelectorAll('[data-modal-close]').forEach((button) => {
        button.addEventListener('click', () => button.closest('.modal_backdrop')?.classList.remove('open'));
    });
    document.querySelectorAll('.modal_backdrop').forEach((backdrop) => {
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) backdrop.classList.remove('open');
        });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (alertModalState) runAlertModalAction(false);
        document.querySelectorAll('.modal_backdrop.open:not([data-alert-modal])').forEach((modal) => modal.classList.remove('open'));
    });

    const initUserDatepickers = () => {
        if (typeof window.flatpickr !== 'function') return;

        const locale = window.flatpickr.l10ns?.ko || 'default';
        const dateRanges = [];
        const initializedInputs = new Set();
        const periodPresets = {
            '1일': { days: 1 },
            '1주': { days: 7 },
            '1개월': { months: 1 },
            '3개월': { months: 3 },
            '6개월': { months: 6 },
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
            onValueUpdate: (_dates, _dateString, instance) => syncYearSelect(instance),
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

        document.querySelectorAll('.date_controls').forEach((controls) => {
            const inputs = [...controls.querySelectorAll('.js_datepicker')];
            if (inputs.length < 2) return;

            let endPicker;
            const startPicker = window.flatpickr(inputs[0], {
                ...baseOptions,
                onChange: (dates) => endPicker?.set('minDate', dates[0] || null),
            });
            endPicker = window.flatpickr(inputs[1], {
                ...baseOptions,
                onChange: (dates) => startPicker.set('maxDate', dates[0] || null),
            });
            initializedInputs.add(inputs[0]);
            initializedInputs.add(inputs[1]);

            const syncRange = () => {
                startPicker.set('maxDate', endPicker.selectedDates[0] || null);
                endPicker.set('minDate', startPicker.selectedDates[0] || null);
            };
            syncRange();

            const periodButtons = [...controls.querySelectorAll('[data-range]')];
            const defaultActiveButton = periodButtons.find((button) => button.classList.contains('active'));
            const applyPeriod = (button, endDate) => {
                const preset = periodPresets[button?.textContent.trim()];
                if (!preset || !endDate) return;

                startPicker.set('maxDate', null);
                endPicker.set('minDate', null);
                startPicker.setDate(getPeriodStartDate(endDate, preset), false);
                endPicker.setDate(endDate, false);
                syncRange();
                periodButtons.forEach((item) => item.classList.toggle('active', item === button));
            };

            periodButtons.forEach((button) => {
                button.dataset.initialActive = String(button.classList.contains('active'));
                button.addEventListener('click', () => {
                    const endDate = endPicker.selectedDates[0]
                        || window.flatpickr.parseDate(inputs[1].value, 'Y-m-d')
                        || new Date();
                    applyPeriod(button, endDate);
                });
            });

            const resetRange = () => {
                const endDate = inputs[1].hasAttribute('data-default-today')
                    ? new Date()
                    : window.flatpickr.parseDate(inputs[1].defaultValue, 'Y-m-d');

                if (defaultActiveButton && endDate) {
                    applyPeriod(defaultActiveButton, endDate);
                    return;
                }

                startPicker.set('maxDate', null);
                endPicker.set('minDate', null);
                startPicker.setDate(inputs[0].defaultValue, false, 'Y-m-d');
                endPicker.setDate(endDate || inputs[1].defaultValue, false, 'Y-m-d');
                syncRange();
                periodButtons.forEach((button) => {
                    button.classList.toggle('active', button.dataset.initialActive === 'true');
                });
            };

            resetRange();
            dateRanges.push({ controls, resetRange });
        });

        document.querySelectorAll('.js_datepicker').forEach((input) => {
            if (!initializedInputs.has(input)) window.flatpickr(input, baseOptions);
        });

        document.querySelectorAll('form').forEach((form) => {
            if (!form.querySelector('.js_datepicker')) return;
            form.addEventListener('reset', () => {
                setTimeout(() => {
                    form.querySelectorAll('.js_datepicker').forEach((input) => {
                        if (!input.closest('.date_controls')) {
                            input._flatpickr?.setDate(input.defaultValue, false, 'Y-m-d');
                        }
                    });
                    dateRanges
                        .filter(({ controls }) => form.contains(controls))
                        .forEach(({ resetRange }) => resetRange());
                }, 0);
            });
        });
    };

    initUserDatepickers();

    document.querySelectorAll('.search_filter').forEach((form) => {
        form.addEventListener('submit', (event) => event.preventDefault());
    });

    document.querySelectorAll('[data-manual-input]').forEach((group) => {
        const toggle = group.querySelector('[data-manual-toggle]');
        const fields = [...group.querySelectorAll('[data-manual-field]')];
        const addressButton = group.querySelector('[data-address-search]');

        if (!toggle || !fields.length) return;

        const updateManualState = () => {
            fields.forEach((field) => {
                field.readOnly = !toggle.checked;
            });
            if (addressButton) addressButton.disabled = false;
            group.classList.toggle('is_manual', toggle.checked);
        };

        toggle.addEventListener('change', () => {
            updateManualState();
            if (toggle.checked) fields[0].focus();
        });
        updateManualState();
    });

    document.querySelectorAll('[data-agree-all]').forEach((allCheckbox) => {
        const scope = allCheckbox.closest('.terms_card') || document;
        const itemCheckboxes = [...scope.querySelectorAll('[data-agree-item]')];

        const updateAllCheckbox = () => {
            const checkedCount = itemCheckboxes.filter((checkbox) => checkbox.checked).length;
            allCheckbox.checked = itemCheckboxes.length > 0 && checkedCount === itemCheckboxes.length;
            allCheckbox.indeterminate = checkedCount > 0 && checkedCount < itemCheckboxes.length;
        };

        allCheckbox.addEventListener('change', () => {
            itemCheckboxes.forEach((checkbox) => {
                checkbox.checked = allCheckbox.checked;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            });
            allCheckbox.indeterminate = false;
        });
        itemCheckboxes.forEach((checkbox) => checkbox.addEventListener('change', updateAllCheckbox));
        updateAllCheckbox();
    });

    document.querySelectorAll('[data-toggle-group]').forEach((group) => {
        const buttons = [...group.querySelectorAll('button')];
        buttons.forEach((button) => {
            button.setAttribute('aria-selected', String(button.classList.contains('active')));
            button.addEventListener('click', () => {
                buttons.forEach((item) => {
                    const isSelected = item === button;
                    item.classList.toggle('active', isSelected);
                    item.setAttribute('aria-selected', String(isSelected));
                });
            });
        });
    });

    document.querySelectorAll('select[data-email-domain]').forEach((select) => {
        const input = select.closest('.form_cell')?.querySelector('[data-email-domain-input]');
        if (!input) return;

        select.addEventListener('change', () => {
            const isManual = select.value === 'manual';
            input.readOnly = !isManual;
            if (!isManual) input.value = select.value;
            if (isManual) input.focus();
        });
    });

    document.querySelectorAll('[data-copy]').forEach((button) => {
        button.addEventListener('click', async () => {
            const originalText = button.textContent;
            const originalLabel = button.getAttribute('aria-label');
            const isIconButton = button.classList.contains('summary_copy_button');
            try {
                await navigator.clipboard.writeText(button.dataset.copy);
            } catch {
                const textarea = document.createElement('textarea');
                textarea.value = button.dataset.copy;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.append(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
            }

            if (isIconButton) {
                button.classList.add('is_copied');
                button.setAttribute('aria-label', '복사되었습니다.');
            } else {
                button.textContent = '복사완료';
            }
            clearTimeout(button.copyTimer);
            button.copyTimer = setTimeout(() => {
                if (isIconButton) {
                    button.classList.remove('is_copied');
                    if (originalLabel) button.setAttribute('aria-label', originalLabel);
                    else button.removeAttribute('aria-label');
                } else {
                    button.textContent = originalText;
                }
            }, 1200);
        });
    });

    document.querySelectorAll('.paging').forEach((paging) => {
        const numbers = [...paging.querySelectorAll('.paging_number')];
        const first = paging.querySelector('.first:not(.disabled)');
        const prev = paging.querySelector('.prev:not(.disabled)');
        const next = paging.querySelector('.next:not(.disabled)');
        const last = paging.querySelector('.last:not(.disabled)');
        const activatePage = (index) => {
            const nextIndex = Math.max(0, Math.min(index, numbers.length - 1));
            numbers.forEach((item, itemIndex) => {
                const isActive = itemIndex === nextIndex;
                item.classList.toggle('active', isActive);
                if (isActive) item.setAttribute('aria-current', 'page');
                else item.removeAttribute('aria-current');
            });
        };

        numbers.forEach((number, index) => {
            number.addEventListener('click', (event) => {
                event.preventDefault();
                activatePage(index);
            });
        });
        first?.addEventListener('click', (event) => {
            event.preventDefault();
            activatePage(0);
        });
        last?.addEventListener('click', (event) => {
            event.preventDefault();
            activatePage(numbers.length - 1);
        });
        prev?.addEventListener('click', (event) => {
            event.preventDefault();
            activatePage(Math.max(0, numbers.findIndex((item) => item.classList.contains('active')) - 1));
        });
        next?.addEventListener('click', (event) => {
            event.preventDefault();
            activatePage(numbers.findIndex((item) => item.classList.contains('active')) + 1);
        });
        activatePage(Math.max(0, numbers.findIndex((item) => item.classList.contains('active'))));
    });

    document.querySelectorAll('[data-file-upload]').forEach((upload) => {
        const input = upload.querySelector('[data-file-input]');
        const fileName = upload.querySelector('[data-file-name]');
        const selectButton = upload.querySelector('[data-file-select]');
        const deleteButton = upload.querySelector('[data-file-delete]');

        if (!input || !fileName || !selectButton) return;

        const setFileName = (value) => {
            if (fileName.matches('input, textarea')) fileName.value = value;
            else fileName.textContent = value;

            if (fileName.matches('a')) {
                if (value === emptyText) fileName.removeAttribute('href');
                else fileName.setAttribute('href', 'javascript:;');
            }
            if (deleteButton) deleteButton.hidden = value === emptyText;
        };
        const emptyText = fileName.dataset.emptyText || '첨부된 파일이 없습니다.';

        selectButton.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            const selectedFile = input.files?.[0];
            if (!selectedFile) return;
            setFileName(selectedFile.name);
            upload.classList.add('has_file');
        });
        deleteButton?.addEventListener('click', () => {
            input.value = '';
            setFileName(emptyText);
            upload.classList.remove('has_file');
        });
    });
})();
