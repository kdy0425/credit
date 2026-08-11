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
})();
