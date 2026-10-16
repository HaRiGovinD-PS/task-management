<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: '',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo(
            function (Request $request): ?string {
                if ($request->is(
                    'register',
                    'login',
                    'logout',
                    'me',
                    'tasks',
                    'tasks/*'
                )) {
                    return null;
                }

                return route('login');
            }
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            function (Request $request, \Throwable $exception): bool {
                return $request->is(
                    'register',
                    'login',
                    'logout',
                    'me',
                    'tasks',
                    'tasks/*'
                ) || $request->expectsJson();
            }
        );
    })->create();
