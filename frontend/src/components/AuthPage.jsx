import { useState } from 'react';
import api from '../api/axios';

export default function AuthPage({ onLogin }) {
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        setForm({
            ...form,
            [event.target.name]: event.target.value,
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setErrors({});
        setLoading(true);

        try {
            const endpoint = mode === 'login' ? '/login' : '/register';

            const payload =
                mode === 'login'
                    ? {
                          email: form.email,
                          password: form.password,
                      }
                    : form;

            const response = await api.post(endpoint, payload);
            const { access_token, user } = response.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            onLogin(user);
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
                setError(
                    err.response.data.message ?? 'Please check your input.'
                );
            } else if (err.response?.status === 401) {
                setError('Invalid email or password.');
            } else {
                setError(
                    err.response?.data?.message ??
                        'Unable to connect to the server. Please try again.'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
        setErrors({});
        setForm({
            name: '',
            email: '',
            password: '',
            password_confirmation: '',
        });
    };

    return (
        <main className="auth-page container-fluid min-vh-100 d-flex align-items-center justify-content-center p-4">
            <section className="auth-card auth-single-card bg-white shadow-lg rounded-4 w-100 p-4 p-md-5">
                <div className="auth-form-container mx-auto">
                    <div className="text-center mb-4">
                        <span className="badge text-bg-primary mb-3">TASK MANAGEMENT</span>

                        <h2 className="fw-bold mb-2">
                            {mode === 'login'
                                ? 'Welcome back'
                                : 'Create account'}
                        </h2>

                        <p className="text-secondary mb-0">
                            {mode === 'login'
                                ? 'Sign in to continue to your workspace.'
                                : 'Create an account to get started.'}
                        </p>
                    </div>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {mode === 'register' && (
                            <div className="mb-3">
                                <label htmlFor="name" className="form-label">Full name</label>
                                
                                <input id="name" name="name" type="text"
                                    className={`form-control form-control-lg ${
                                        errors.name ? 'is-invalid' : ''
                                    }`}
                                    value={form.name} onChange={handleChange} required autoComplete="name"/>

                                {errors.name && (
                                    <div className="invalid-feedback">{errors.name[0]}</div>
                                )}
                            </div>
                        )}

                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">Email address</label>

                            <input id="email" name="email" type="email"
                                className={`form-control form-control-lg ${
                                    errors.email ? 'is-invalid' : ''
                                }`}
                                value={form.email} onChange={handleChange} required autoComplete="email"/>

                            {errors.email && (
                                <div className="invalid-feedback">{errors.email[0]} </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">Password</label>

                            <input id="password" name="password" type="password"
                                className={`form-control form-control-lg ${
                                    errors.password ? 'is-invalid' : ''
                                }`}
                                value={form.password} onChange={handleChange} required
                                autoComplete={
                                    mode === 'login'
                                        ? 'current-password'
                                        : 'new-password'
                                }
                            />

                            {errors.password && (
                                <div className="invalid-feedback">{errors.password[0]}</div>
                            )}
                        </div>

                        {mode === 'register' && (
                            <div className="mb-4">
                                <label htmlFor="password_confirmation" className="form-label">Confirm password</label>
                                <input id="password_confirmation" name="password_confirmation" type="password" className="form-control form-control-lg"
                                    value={form.password_confirmation} onChange={handleChange} required autoComplete="new-password"/>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary btn-lg w-100 auth-submit" disabled={loading}>
                            {loading
                                ? 'Please wait...'
                                : mode === 'login'
                                  ? 'Sign in'
                                  : 'Create account'}
                        </button>
                    </form>

                    <p className="text-center text-secondary mt-4 mb-0">
                        {mode === 'login'
                            ? "Don't have an account?"
                            : 'Already have an account?'}{' '}

                        <button type="button" className="btn btn-link p-0 text-decoration-none" onClick={switchMode}>
                            {mode === 'login' ? 'Register' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </section>
        </main>
    );
}