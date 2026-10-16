import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { Pencil, Trash2 } from 'lucide-react';

const statuses = ['Pending', 'In Progress', 'Completed'];

const emptyTaskForm = {
    title: '',
    description: '',
    status: 'Pending',
};

export default function TaskDashboard({ user, onLogout }) {
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingTaskId, setDeletingTaskId] = useState(null);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!success) return;

        const timer = setTimeout(() => {
            setSuccess('');
        }, 5000);

        return () => clearTimeout(timer);
    }, [success]);

    useEffect(() => {
        if (!error) return;

        const timer = setTimeout(() => {
            setError('');
        }, 5000);

        return () => clearTimeout(timer);
    }, [error]);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 10,
    });

    const [form, setForm] = useState({
        ...emptyTaskForm,
        user_id: String(user.id),
    });
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editForm, setEditForm] = useState(emptyTaskForm);

    const isAdmin = user.role === 'admin';

    const canManageTask = (task) =>
        isAdmin || Number(task.user_id) === Number(user.id);

    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        const loadUsers = async () => {
            setLoadingUsers(true);

            try {
                const response = await api.get('/users');
                setUsers(response.data.users ?? []);
            } catch (err) {
                setError(
                    err.response?.data?.message ??
                        'Unable to load users for task assignment.'
                );
            } finally {
                setLoadingUsers(false);
            }
        };

        loadUsers();
    }, [isAdmin]);

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.get('/tasks', {
                params: {
                    page,
                    search: search || undefined,
                    status: statusFilter || undefined,
                },
            });

            setTasks(response.data.data);
            setPagination({
                current_page: response.data.current_page,
                last_page: response.data.last_page,
                total: response.data.total,
                per_page: response.data.per_page,
            });
        } catch (err) {
            setError(
                err.response?.data?.message ??
                    'Unable to load tasks. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleFormChange = (event) => {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    };

    const handleEditFormChange = (event) => {
        setEditForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    };

    const handleSearch = (event) => {
        event.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    const handleFilterChange = (event) => {
        setStatusFilter(event.target.value);
        setPage(1);
    };

    const handleCreateTask = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);

        try {
            const taskPayload = {
                title: form.title,
                description: form.description,
                status: form.status,
                ...(isAdmin ? { user_id: Number(form.user_id) } : {}),
            };

            await api.post('/tasks', taskPayload);

            setForm({
                ...emptyTaskForm,
                user_id: String(user.id),
            });
            setSearchInput('');
            setSearch('');
            setStatusFilter('');
            setPage(1);
            setSuccess('Task created successfully.');

            if (page === 1 && !search && !statusFilter) {
                await loadTasks();
            }
        } catch (err) {
            if (err.response?.status === 422) {
                const validationErrors = err.response.data.errors ?? {};
                setError(Object.values(validationErrors).flat().join(' '));
            } else {
                setError(
                    err.response?.data?.message ??
                        'Unable to create the task.'
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    const startEditing = (task) => {
        setError('');
        setSuccess('');
        setEditingTaskId(task.id);
        setEditForm({
            title: task.title,
            description: task.description ?? '',
            status: task.status,
        });
    };

    const cancelEditing = () => {
        setEditingTaskId(null);
        setEditForm(emptyTaskForm);
    };

    const handleUpdateTask = async (event) => {
        event.preventDefault();

        if (!editingTaskId) {
            return;
        }

        setError('');
        setSuccess('');
        setSavingEdit(true);

        try {
            const response = await api.patch(
                `/tasks/${editingTaskId}`,
                editForm
            );

            const updatedTask = response.data.task;

            setTasks((currentTasks) =>
                currentTasks.map((task) =>
                    task.id === editingTaskId ? updatedTask : task
                )
            );

            setEditingTaskId(null);
            setEditForm(emptyTaskForm);
            setSuccess('Task updated successfully.');

            await loadTasks();
        } catch (err) {
            if (err.response?.status === 422) {
                const validationErrors = err.response.data.errors ?? {};
                setError(Object.values(validationErrors).flat().join(' '));
            } else if (err.response?.status === 403) {
                setError('You are not allowed to update this task.');
            } else {
                setError(
                    err.response?.data?.message ??
                        'Unable to update the task.'
                );
            }
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteTask = async (task) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${task.title}"? This action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        setError('');
        setSuccess('');
        setDeletingTaskId(task.id);

        try {
            await api.delete(`/tasks/${task.id}`);

            setSuccess('Task deleted successfully.');

            if (editingTaskId === task.id) {
                cancelEditing();
            }

            if (tasks.length === 1 && page > 1) {
                setPage((currentPage) => currentPage - 1);
            } else {
                await loadTasks();
            }
        } catch (err) {
            if (err.response?.status === 403) {
                setError('You are not allowed to delete this task.');
            } else {
                setError(
                    err.response?.data?.message ??
                        'Unable to delete the task.'
                );
            }
        } finally {
            setDeletingTaskId(null);
        }
    };

    const changePage = (nextPage) => {
        if (nextPage >= 1 && nextPage <= pagination.last_page && nextPage !== page) {
            setPage(nextPage);
        }
    };

    const statusClass = (status) => {
        switch (status) {
            case 'Completed':
                return 'task-status-completed';
            case 'In Progress':
                return 'task-status-progress';
            default:
                return 'task-status-pending';
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch {
            
        } finally {
            onLogout();
        }
    };

    return (
        <main className="dashboard-page min-vh-100">
            <nav className="navbar bg-white border-bottom py-3">
                <div className="container dashboard-container">
                    <a className="navbar-brand fw-bold" href="#dashboard">
                        <span className="brand-mark">T</span>
                        Task Management
                    </a>

                    <div className="d-flex align-items-center gap-3">
                        <div className="text-end d-none d-sm-block">
                            <div className="fw-semibold small">
                                {user.name}
                            </div>
                            <div className="text-secondary small">
                                {user.role}
                            </div>
                        </div>

                        <button type="button" className="btn btn-outline-dark btn-sm" onClick={handleLogout}>
                            Sign out
                        </button>
                    </div>
                </div>
            </nav>

            <div className="container dashboard-container py-4 py-lg-5">
                <div className="dashboard-heading mb-4">
                    <div>
                        <span className="dashboard-eyebrow">YOUR WORKSPACE</span>
                        <h1 className="fw-bold mt-2 mb-2">
                            Task dashboard
                        </h1>
                    </div>

                    <div className="task-total">
                        <span className="text-secondary small">Total tasks</span>
                        <strong>{pagination.total}</strong>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success" role="alert">
                        {success}
                    </div>
                )}

                <div className="row g-4">
                    <div className="col-lg-4">
                        <section className="card dashboard-card h-100">
                            <div className="card-body p-4">
                                <div className="section-heading mb-4">
                                    <span className="section-icon">+</span>
                                    <div>
                                        <h2 className="h5 fw-bold mb-1">Create a task</h2>
                                        <p className="text-secondary small mb-0">
                                            Add something to your list.
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleCreateTask}>
                                    <div className="mb-3">
                                        <label htmlFor="task-title" className="form-label">Task title</label>

                                        <input id="task-title" name="title" type="text" className="form-control" placeholder="e.g. Finish project report"
                                            value={form.title} onChange={handleFormChange} maxLength={255} required/>
                                    </div>

                                    <div className="mb-3">
                                        <label htmlFor="task-description" className="form-label">Description</label>
                                        <textarea id="task-description" name="description" className="form-control" rows="4"
                                            placeholder="Add some details..." value={form.description} onChange={handleFormChange} maxLength={2000}/>
                                    </div>

                                    {isAdmin && (
                                        <div className="mb-3">
                                            <label htmlFor="task-assignee" className="form-label">Assign To</label>
                                            <select id="task-assignee" name="user_id" className="form-select" value={form.user_id}
                                                onChange={handleFormChange} disabled={loadingUsers || users.length === 0} required>
                                                {loadingUsers ? (
                                                    <option value={form.user_id}>Loading users...</option>
                                                ) : users.length === 0 ? (
                                                    <option value="">No users available</option>
                                                ) : (
                                                    users.map((assignableUser) => (
                                                        <option key={assignableUser.id} value={String(assignableUser.id)}>
                                                            {assignableUser.name}
                                                            {Number(assignableUser.id) === Number(user.id)
                                                                ? ' (You)'
                                                                : ''}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            <div className="form-text">Choose who this task belongs to.</div>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <label htmlFor="task-status" className="form-label">Status</label>
                                        
                                        <select id="task-status" name="status" className="form-select" value={form.status} onChange={handleFormChange}>
                                            {statuses.map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <button type="submit" className="btn btn-warning w-100 fw-semibold" disabled={submitting}>
                                        {submitting
                                            ? 'Creating...'
                                            : '+ Create task'}
                                    </button>
                                </form>
                            </div>
                        </section>
                    </div>

                    <div className="col-lg-8">
                        <section className="card dashboard-card">
                            <div className="card-body p-4">
                                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                                    <div>
                                        <h2 className="h5 fw-bold mb-1">All tasks</h2>
                                        <p className="text-secondary small mb-0">
                                            {isAdmin
                                                ? 'Tasks from all users'
                                                : 'Your personal task list'}
                                        </p>
                                    </div>

                                    <span className="task-count-badge">
                                        {pagination.total} tasks
                                    </span>
                                </div>

                                <form onSubmit={handleSearch} className="row g-2 mb-4">
                                    <div className="col-sm">
                                        <input type="search" className="form-control" placeholder="Search task titles..." value={searchInput}
                                            onChange={(event) =>
                                                setSearchInput(
                                                    event.target.value
                                                )
                                            }
                                            aria-label="Search task titles"/>
                                    </div>

                                    <div className="col-sm-5 col-md-4">
                                        <select className="form-select" value={statusFilter} onChange={handleFilterChange} aria-label="Filter by status">
                                            <option value="">All statuses</option>
                                            {statuses.map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-auto">
                                        <button type="submit" className="btn btn-dark">
                                            Search
                                        </button>
                                    </div>
                                </form>

                                {loading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-warning" role="status">
                                            <span className="visually-hidden">
                                                Loading...
                                            </span>
                                        </div>
                                        <p className="text-secondary mt-3 mb-0">Loading tasks...</p>
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <div className="empty-state text-center py-5">
                                        <div className="empty-state-icon">
                                            ✓
                                        </div>
                                        <h3 className="h6 fw-bold mt-3">No tasks found</h3>
                                        <p className="text-secondary small mb-0">
                                            Create a task or adjust your search
                                            and filters.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="task-list">
                                        {tasks.map((task) => (
                                            <article className="task-item" key={task.id}>
                                                <div className="task-item-main flex-grow-1">
                                                    {editingTaskId === task.id ? (
                                                        <form onSubmit={handleUpdateTask} className="task-edit-form">
                                                            <h3 className="h6 fw-bold mb-3">Edit task</h3>

                                                            <div className="mb-3">
                                                                <label htmlFor={`edit-title-${task.id}`} className="form-label">
                                                                    Title
                                                                </label>

                                                                <input id={`edit-title-${task.id}`} name="title" type="text" className="form-control"
                                                                    value={editForm.title} onChange={handleEditFormChange} maxLength={255} required/>
                                                            </div>

                                                            <div className="mb-3">
                                                                <label htmlFor={`edit-description-${task.id}`} className="form-label">
                                                                    Description
                                                                </label>

                                                                <textarea id={`edit-description-${task.id}`} name="description" className="form-control"
                                                                    rows="3" value={editForm.description} onChange={handleEditFormChange} maxLength={2000}/>
                                                            </div>

                                                            <div className="mb-3">
                                                                <label htmlFor={`edit-status-${task.id}`} className="form-label">
                                                                    Status
                                                                </label>

                                                                <select id={`edit-status-${task.id}`} name="status" className="form-select"
                                                                    value={editForm.status} onChange={handleEditFormChange}>
                                                                    {statuses.map((status) => (
                                                                        <option key={status} value={status}>
                                                                            {status}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div className="d-flex flex-wrap gap-2">
                                                                <button type="submit" className="btn btn-warning btn-sm fw-semibold" disabled={savingEdit}>
                                                                    {savingEdit
                                                                        ? 'Saving...'
                                                                        : 'Save changes'}
                                                                </button>

                                                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cancelEditing} disabled={savingEdit}>
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </form>
                                                    ) : (
                                                        <>
                                                            <h3 className="h6 fw-semibold mb-2">
                                                                {task.title}
                                                            </h3>

                                                            {task.description && (
                                                                <p className="text-secondary small mb-2 task-description">
                                                                    {task.description}
                                                                </p>
                                                            )}

                                                            <div className="task-meta">
                                                                <span>#{task.id}</span>

                                                                {isAdmin && task.user && (
                                                                    <span>
                                                                        Owner: {task.user.name}
                                                                    </span>
                                                                )}

                                                                <span>
                                                                    {task.created_at
                                                                        ? new Date(task.created_at).toLocaleDateString()
                                                                        : ''}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {editingTaskId !== task.id && (
                                                    <div className="task-item-actions">
                                                        <span
                                                            className={`task-status ${statusClass(
                                                                task.status
                                                            )}`}
                                                        >
                                                            {task.status}
                                                        </span>

                                                        {canManageTask(task) && (
                                                            
                                                            <div className="d-flex gap-2 mt-3">
                                                                <button type="button" className="btn btn-icon btn-edit" onClick={() => startEditing(task)}
                                                                    disabled={deletingTaskId === task.id} aria-label={`Edit ${task.title}`} title="Edit task" >
                                                                    <Pencil size={16} />
                                                                </button>

                                                                <button type="button" className="btn btn-icon btn-delete" onClick={() => handleDeleteTask(task)}
                                                                    disabled={deletingTaskId === task.id} aria-label={`Delete ${task.title}`} title="Delete task">
                                                                    {deletingTaskId === task.id ? (
                                                                        <span
                                                                            className="spinner-border spinner-border-sm"
                                                                            aria-hidden="true"
                                                                        />
                                                                    ) : (
                                                                        <Trash2 size={16} />
                                                                    )}
                                                                </button>
                                                            </div>

                                                        )}
                                                    </div>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                )}

                                {!loading && pagination.last_page > 1 && (
                                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4">
                                        <span className="text-secondary small">
                                            Page {pagination.current_page} of{' '}
                                            {pagination.last_page}
                                        </span>

                                        <div className="d-flex gap-2">
                                            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page <= 1}
                                                onClick={() => changePage(page - 1)}>
                                                Previous
                                            </button>

                                            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={page >= pagination.last_page}
                                                onClick={() => changePage(page + 1)}>Next</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
}