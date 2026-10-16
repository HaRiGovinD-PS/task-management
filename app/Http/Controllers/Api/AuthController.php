<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller {

    public function register(RegisterRequest $request): JsonResponse {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
        ]);

        $token = auth('api')->login($user);

        return response()->json([
            'message' => 'Registration successful.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => $user,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse {
        $credentials = $request->validated();

        if (! $token = auth('api')->attempt($credentials)) {
            return response()->json([
                'message' => 'Invalid email or password.',
            ], 401);
        }

        return $this->respondWithToken($token);
    }

    public function me(): JsonResponse {
        return response()->json([
            'user' => auth('api')->user(),
        ]);
    }

    public function logout(): JsonResponse {
        auth('api')->logout();

        return response()->json([
            'message' => 'Successfully logged out.',
        ]);
    }

    protected function respondWithToken(string $token): JsonResponse {
        return response()->json([
            'message' => 'Login successful.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60,
            'user' => auth('api')->user(),
        ]);
    }
}
