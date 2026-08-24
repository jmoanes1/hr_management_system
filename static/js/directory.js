/**
 * Employee Directory — search, filters, name details & pagination
 */

(function () {
    'use strict';

    if (!document.getElementById('searchInput')) return;

    const searchInput = document.getElementById('searchInput');
    const departmentFilter = document.getElementById('departmentFilter');
    const positionFilter = document.getElementById('positionFilter');
    const statusFilter = document.getElementById('statusFilter');
    const sortFilter = document.getElementById('sortFilter');
    const cardView = document.getElementById('cardView');
    const tableView = document.getElementById('tableView');
    const tableBody = document.getElementById('tableBody');
    const resultsCount = document.getElementById('resultsCount');
    const pagination = document.getElementById('pagination');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const activeFiltersEl = document.getElementById('activeFilters');
    const resultsWrap = document.getElementById('directoryResults');

    let currentPage = 1;
    let currentView = document.querySelector('.view-btn.active')?.dataset.view || 'card';
    let debounceTimer = null;

    const filterMap = [
        { el: searchInput, key: 'search', label: 'Search' },
        { el: departmentFilter, key: 'department', label: 'Department', optionLabel: true },
        { el: positionFilter, key: 'position', label: 'Position', optionLabel: true },
        { el: statusFilter, key: 'status', label: 'Status', optionLabel: true },
    ];

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function displayName(value) {
        return escapeHtml(value || '—');
    }

    function getFilters() {
        return {
            search: searchInput.value.trim(),
            department: departmentFilter.value,
            position: positionFilter.value,
            status: statusFilter.value,
            sort: sortFilter.value,
            per_page: document.getElementById('perPageSelect')?.value || '',
            page: currentPage,
        };
    }

    function hasActiveFilters() {
        const f = getFilters();
        return !!(f.search || f.department || f.position || f.status);
    }

    function buildQueryString(params) {
        return Object.entries(params)
            .filter(([, v]) => v)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
    }

    function setLoading(loading) {
        resultsWrap?.classList.toggle('is-loading', loading);
    }

    function updateFilterUI() {
        const active = hasActiveFilters();
        clearFiltersBtn.hidden = !active;

        if (!activeFiltersEl) return;
        activeFiltersEl.innerHTML = '';

        filterMap.forEach(({ el, key, label, optionLabel }) => {
            const val = el.value;
            if (!val) return;
            const display = optionLabel
                ? el.options[el.selectedIndex]?.text || val
                : val;
            const chip = document.createElement('span');
            chip.className = 'filter-chip';
            chip.innerHTML = `${label}: ${display} <button type="button" aria-label="Remove ${label} filter" data-clear="${key}">&times;</button>`;
            activeFiltersEl.appendChild(chip);
        });

        activeFiltersEl.querySelectorAll('[data-clear]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.clear;
                if (key === 'search') searchInput.value = '';
                else if (key === 'department') departmentFilter.value = '';
                else if (key === 'position') positionFilter.value = '';
                else if (key === 'status') statusFilter.value = '';
                currentPage = 1;
                updateFilterUI();
                fetchEmployees();
            });
        });
    }

    function clearAllFilters() {
        searchInput.value = '';
        departmentFilter.value = '';
        positionFilter.value = '';
        statusFilter.value = '';
        sortFilter.value = 'last_name';
        currentPage = 1;
        updateFilterUI();
        fetchEmployees();
        searchInput.focus();
    }

    function emptyStateHtml() {
        return `
            <div class="empty-state compact-empty">
                <h3>No employees found</h3>
                <p>Try a different search or clear your filters.</p>
                <div class="empty-state-actions">
                    <a href="#" class="btn-link">Clear filters</a>
                </div>
            </div>`;
    }

    function bindEmptyStateActions(container) {
        container.querySelectorAll('a[href="#"]').forEach(link => {
            if (link.textContent.includes('Clear')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    clearAllFilters();
                });
            }
        });
    }

    function groupByLetter(employees) {
        const groups = {};
        employees.forEach(emp => {
            const letter = (emp.last_name || emp.full_name || '?').charAt(0).toUpperCase();
            if (!groups[letter]) groups[letter] = [];
            groups[letter].push(emp);
        });
        return Object.keys(groups).sort().map(letter => ({ letter, items: groups[letter] }));
    }

    function renderAvatar(emp, sizeClass) {
        if (emp.photo_url) {
            return `<div class="avatar ${sizeClass}"><img src="${escapeHtml(emp.photo_url)}" alt="${escapeHtml(emp.full_name)}"></div>`;
        }
        return `<div class="avatar ${sizeClass}">${escapeHtml(emp.initials)}</div>`;
    }

    function renderPerson(emp) {
        const photo = renderAvatar(emp, 'avatar-md');
        const role = [emp.position, emp.department].filter(Boolean).join(' · ') || '—';
        const email = emp.email
            ? `<a href="mailto:${escapeHtml(emp.email)}" class="dir-person-email" title="Email ${escapeHtml(emp.full_name)}">${escapeHtml(emp.email)}</a>`
            : '';
        const statusCode = escapeHtml(emp.status_code || 'inactive');
        const status = escapeHtml(emp.status || 'Unknown');

        return `
            <article class="dir-person">
                <a href="${escapeHtml(emp.detail_url)}" class="dir-person-hit" tabindex="-1" aria-hidden="true"></a>
                ${photo}
                <div class="dir-person-copy">
                    <a href="${escapeHtml(emp.detail_url)}" class="dir-person-name">${escapeHtml(emp.full_name)}</a>
                    <p class="dir-person-role">${escapeHtml(role)}</p>
                </div>
                <div class="dir-person-meta">
                    <span class="dir-person-id">${escapeHtml(emp.employee_id || '')}</span>
                    <span class="badge badge-${statusCode}">${status}</span>
                    ${email}
                </div>
            </article>`;
    }

    function renderAlphaGrid(employees) {
        return groupByLetter(employees).map(group => `
            <section class="dir-alpha-group">
                <span class="dir-alpha-letter" aria-hidden="true">${escapeHtml(group.letter)}</span>
                <div class="dir-alpha-cards">
                    ${group.items.map(renderPerson).join('')}
                </div>
            </section>
        `).join('');
    }

    function renderTableRow(emp) {
        const avatar = renderAvatar(emp, 'avatar-sm');
        return `
            <tr class="emp-table-row" data-href="${escapeHtml(emp.detail_url)}" tabindex="0" role="link" aria-label="View ${escapeHtml(emp.full_name)}">
                <td>
                    <a href="${escapeHtml(emp.detail_url)}" class="table-employee">
                        ${avatar}
                        ${escapeHtml(emp.full_name)}
                    </a>
                </td>
                <td>${escapeHtml(emp.employee_id)}</td>
                <td>${escapeHtml(emp.department)}</td>
                <td>${escapeHtml(emp.position)}</td>
                <td><span class="badge badge-${escapeHtml(emp.status_code || '')}">${escapeHtml(emp.status)}</span></td>
                <td>${escapeHtml(emp.email)}</td>
                <td class="actions-cell"><a href="${escapeHtml(emp.detail_url)}" class="btn btn-outline btn-sm">View</a></td>
            </tr>`;
    }

    function renderPaginationPages(pageWindow, currentPage) {
        return pageWindow.map(page => {
            if (page === null) {
                return '<span class="pagination-ellipsis">…</span>';
            }
            if (page === currentPage) {
                return `<span class="pagination-page is-active" aria-current="page">${page}</span>`;
            }
            return `<button type="button" class="pagination-page" data-page="${page}">${page}</button>`;
        }).join('');
    }

    function renderPagination(data) {
        if (!pagination) return;

        const summaryText = data.total_count
            ? `Showing ${data.start_index}–${data.end_index} of ${data.total_count} employees`
            : 'No employees to display';

        let controlsHtml = '';
        if (data.num_pages > 1) {
            const prevPage = data.has_previous ? data.current_page - 1 : '';
            const nextPage = data.has_next ? data.current_page + 1 : '';
            controlsHtml = `
                <div class="pagination-controls">
                    <button type="button" class="btn btn-outline btn-sm pagination-nav" data-page="${prevPage}" ${data.has_previous ? '' : 'disabled'} aria-label="Previous page">←</button>
                    <div class="pagination-pages">${renderPaginationPages(data.page_window || [], data.current_page)}</div>
                    <button type="button" class="btn btn-outline btn-sm pagination-nav" data-page="${nextPage}" ${data.has_next ? '' : 'disabled'} aria-label="Next page">→</button>
                </div>`;
        }

        const perPageOptions = [12, 24, 48, 96];
        const perPage = data.per_page || document.getElementById('perPageSelect')?.value || 12;
        const optionsHtml = perPageOptions.map(size =>
            `<option value="${size}" ${Number(perPage) === size ? 'selected' : ''}>${size}</option>`
        ).join('');

        pagination.innerHTML = `
            <div class="pagination-summary" id="paginationSummary">${summaryText}</div>
            ${controlsHtml}
            <div class="pagination-per-page">
                <label for="perPageSelect">Per page</label>
                <select id="perPageSelect" class="form-control form-select form-select-sm">
                    ${optionsHtml}
                </select>
            </div>`;

        pagination.querySelectorAll('[data-page]').forEach(btn => {
            if (!btn.dataset.page) return;
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.page, 10);
                fetchEmployees();
                resultsWrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        const newPerPageSelect = pagination.querySelector('#perPageSelect');
        newPerPageSelect?.addEventListener('change', () => {
            currentPage = 1;
            fetchEmployees();
        });
    }

    function fetchEmployees() {
        const qs = buildQueryString(getFilters());
        setLoading(true);
        updateFilterUI();

        fetch(`/employees/search/?${qs}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then(r => {
                if (!r.ok) throw new Error('Search failed');
                return r.json();
            })
            .then(data => {
                resultsCount.textContent = `${data.total_count} employee${data.total_count !== 1 ? 's' : ''}`;

                if (currentView === 'card') {
                    if (data.employees.length) {
                        cardView.innerHTML = renderAlphaGrid(data.employees);
                    } else {
                        cardView.innerHTML = emptyStateHtml();
                        bindEmptyStateActions(cardView);
                    }
                } else {
                    tableBody.innerHTML = data.employees.length
                        ? data.employees.map(renderTableRow).join('')
                        : `<tr><td colspan="7">${emptyStateHtml()}</td></tr>`;
                    if (!data.employees.length) bindEmptyStateActions(tableBody);
                }

                renderPagination(data);
            })
            .catch(() => {
                window.Toast?.show('Could not load employees. Please try again.', 'error');
            })
            .finally(() => setLoading(false));
    }

    function debouncedSearch() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentPage = 1;
            fetchEmployees();
        }, 300);
    }

    searchInput.addEventListener('input', debouncedSearch);
    [departmentFilter, positionFilter, statusFilter, sortFilter].forEach(el => {
        el.addEventListener('change', () => {
            currentPage = 1;
            fetchEmployees();
        });
    });

    clearFiltersBtn?.addEventListener('click', clearAllFilters);

    const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
    const filtersPanel = document.getElementById('filtersPanel');
    toggleFiltersBtn?.addEventListener('click', () => {
        const isOpen = filtersPanel?.classList.toggle('is-open');
        toggleFiltersBtn.classList.toggle('is-open', isOpen);
        toggleFiltersBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            currentView = btn.dataset.view;

            cardView.classList.toggle('hidden', currentView !== 'card');
            tableView.classList.toggle('hidden', currentView !== 'table');
            document.getElementById('gridHeaders')?.classList.toggle('hidden', currentView !== 'card');
            fetchEmployees();
        });
    });

    function bindPaginationEvents() {
        pagination?.querySelectorAll('[data-page]').forEach(btn => {
            if (!btn.dataset.page) return;
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.page, 10);
                fetchEmployees();
                resultsWrap?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        pagination?.querySelector('#perPageSelect')?.addEventListener('change', () => {
            currentPage = 1;
            fetchEmployees();
        });
    }

    bindPaginationEvents();

    departmentFilter?.addEventListener('change', function () {
        const deptId = this.value;
        if (!deptId) return;
        fetch(`/employees/positions/${deptId}/`)
            .then(r => r.json())
            .then(data => {
                positionFilter.innerHTML = '<option value="">All positions</option>';
                data.positions.forEach(p => {
                    positionFilter.innerHTML += `<option value="${p.id}">${p.title}</option>`;
                });
            });
    });

    // Whole table row opens the employee profile (delegated so AJAX redraws keep working)
    tableBody?.addEventListener('click', (e) => {
        const row = e.target.closest('.emp-table-row[data-href]');
        if (!row || e.target.closest('a, button')) return;
        window.location.href = row.dataset.href;
    });
    tableBody?.addEventListener('keydown', (e) => {
        const row = e.target.closest('.emp-table-row[data-href]');
        if (!row) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.location.href = row.dataset.href;
        }
    });

    bindEmptyStateActions(document.getElementById('cardView'));
    updateFilterUI();
})();
