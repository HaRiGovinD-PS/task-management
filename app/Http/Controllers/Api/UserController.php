<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller {
    public function index(Request $request): JsonResponse {
        abort_unless($request->user()->role === 'admin', 403, 'Unauthorized.');

        $users = User::query()
            ->select('id', 'name', 'email', 'role')
            ->orderBy('name')
            ->get();

        return response()->json([
            'users' => $users,
        ]);
    }
}
