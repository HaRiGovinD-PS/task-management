<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TaskController extends Controller {
    
    public function index(Request $request): JsonResponse {
        $user = $request->user();

        $query = Task::query()->with('user:id,name,email');

        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        if ($request->filled('search')) {
            $search = $request->input('search');

            $query->where('title', 'like', '%' . $search . '%');
        }

        if ($request->filled('status')) {
            $request->validate([
                'status' => [
                    'required',
                    'string',
                    'in:Pending,In Progress,Completed',
                ],
            ]);

            $query->where('status', $request->input('status'));
        }

        $tasks = $query->latest()->paginate(10)->withQueryString();

        return response()->json($tasks);
    }

    public function store(StoreTaskRequest $request): JsonResponse {
        $validated = $request->validated();
        $authenticatedUser = $request->user();

        if ($authenticatedUser->role === 'admin') {
            $assignedUserId = $validated['user_id'] ?? $authenticatedUser->id;
        } else {
            if (isset($validated['user_id']) && (int) $validated['user_id'] !== (int) $authenticatedUser->id) {
                abort(403, 'You can only create tasks for yourself.');
            }

            $assignedUserId = $authenticatedUser->id;
        }

        unset($validated['user_id']);

        $task = new Task($validated);
        $task->user_id = $assignedUserId;
        $task->save();

        $task->load('user:id,name,email');

        return response()->json([
            'message' => 'Task created successfully.',
            'task' => $task,
        ], 201);
    }

    public function show(Request $request, Task $task): JsonResponse {
        $this->authorizeTaskAccess($request, $task);

        $task->load('user:id,name,email');

        return response()->json([
            'task' => $task,
        ]);
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse {
        $this->authorizeTaskAccess($request, $task);

        $task->update($request->validated());

        $task->load('user:id,name,email');

        return response()->json([
            'message' => 'Task updated successfully.',
            'task' => $task,
        ]);
    }

    public function destroy(Request $request, Task $task): Response {
        $this->authorizeTaskAccess($request, $task);

        $task->delete();

        return response()->noContent();
    }

    private function authorizeTaskAccess(Request $request, Task $task): void {
        $user = $request->user();

        abort_unless(
            $user->role === 'admin' || $task->user_id === $user->id,
            403,
            'You are not authorized to access this task.'
        );
    }
}
