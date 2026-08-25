(function () {
    document.querySelectorAll('.tabs').forEach((tabList) => {
        if (tabList.closest('.js_search_form')) {
            return;
        }

        const tabButtons = [...tabList.querySelectorAll('a, button')];
        tabList.setAttribute('role', 'tablist');

        tabButtons.forEach((tabButton) => {
            tabButton.setAttribute('role', 'tab');
            tabButton.setAttribute('aria-selected', String(tabButton.classList.contains('active')));
            tabButton.addEventListener('click', (event) => {
                event.preventDefault();
                tabButtons.forEach((button) => {
                    button.classList.remove('active');
                    button.setAttribute('aria-selected', 'false');
                });
                tabButton.classList.add('active');
                tabButton.setAttribute('aria-selected', 'true');
            });
        });
    });

    document.querySelectorAll('form').forEach((form) => {
        form.addEventListener('submit', (event) => event.preventDefault());
    });

    document.querySelectorAll('[data-session-timer]').forEach((timer) => {
        const session = timer.closest('.header_session');
        const extendButton = session?.querySelector('[data-session-extend]');
        let remainingSeconds = Number(timer.dataset.sessionTimer || 1758);

        const renderTimer = () => {
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };

        extendButton?.addEventListener('click', () => {
            remainingSeconds = 1758;
            renderTimer();
            extendButton.classList.add('is_extended');
            window.setTimeout(() => extendButton.classList.remove('is_extended'), 600);
        });

        renderTimer();
        window.setInterval(() => {
            remainingSeconds = Math.max(0, remainingSeconds - 1);
            renderTimer();
        }, 1000);
    });

    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
        const input = document.getElementById(button.dataset.passwordToggle);
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
        button.addEventListener('click', () => {
            updatePasswordState(input.type === 'password');
        });
    });
})();
