<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskApiTest extends TestCase {
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_tasks(): void {
        $this->getJson('/tasks')
            ->assertUnauthorized();
    }

    public function test_user_can_register_and_receive_a_token(): void {
        $response = $this->postJson('/register', [
            'name' => 'Test User',
            'email' => 'newuser@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'message',
                'access_token',
                'token_type',
                'expires_in',
                'user',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'newuser@example.com',
            'role' => 'user',
        ]);
    }

    public function test_user_can_create_a_task(): void {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'api')
            ->postJson('/tasks', [
                'title' => 'My First Task',
                'description' => 'Task description',
                'status' => 'Pending',
            ]);

        $response->assertCreated()
            ->assertJsonPath('task.title', 'My First Task')
            ->assertJsonPath('task.user_id', $user->id);

        $this->assertDatabaseHas('tasks', [
            'user_id' => $user->id,
            'title' => 'My First Task',
        ]);
    }

    public function test_user_can_list_only_their_own_tasks(): void {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        Task::factory()->create([
            'user_id' => $user->id,
            'title' => 'My Task',
        ]);

        Task::factory()->create([
            'user_id' => $otherUser->id,
            'title' => 'Other User Task',
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/tasks');

        $response->assertOk()
            ->assertJsonFragment(['title' => 'My Task'])
            ->assertJsonMissing(['title' => 'Other User Task']);
    }

    public function test_user_cannot_access_another_users_task(): void {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $task = Task::factory()->create([
            'user_id' => $otherUser->id,
        ]);

        $this->actingAs($user, 'api')
            ->getJson("/tasks/{$task->id}")
            ->assertForbidden();
    }

    public function test_admin_can_view_all_tasks(): void {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $user = User::factory()->create();

        Task::factory()->create([
            'user_id' => $admin->id,
            'title' => 'Admin Task',
        ]);

        Task::factory()->create([
            'user_id' => $user->id,
            'title' => 'User Task',
        ]);

        $response = $this->actingAs($admin, 'api')
            ->getJson('/tasks');

        $response->assertOk()
            ->assertJsonFragment(['title' => 'Admin Task'])
            ->assertJsonFragment(['title' => 'User Task']);
    }

    public function test_user_can_update_their_own_task(): void {
        $user = User::factory()->create();

        $task = Task::factory()->create([
            'user_id' => $user->id,
            'title' => 'Original Task',
            'status' => 'Pending',
        ]);

        $response = $this->actingAs($user, 'api')
            ->patchJson("/tasks/{$task->id}", [
                'title' => 'Updated Task',
                'status' => 'In Progress',
            ]);

        $response->assertOk()
            ->assertJsonPath('task.title', 'Updated Task')
            ->assertJsonPath('task.status', 'In Progress');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Updated Task',
            'status' => 'In Progress',
        ]);
    }

    public function test_user_can_delete_their_own_task(): void {
        $user = User::factory()->create();

        $task = Task::factory()->create([
            'user_id' => $user->id,
        ]);

        $this->actingAs($user, 'api')
            ->deleteJson("/tasks/{$task->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('tasks', [
            'id' => $task->id,
        ]);
    }

    public function test_task_title_is_required(): void {
        $user = User::factory()->create();

        $this->actingAs($user, 'api')
            ->postJson('/tasks', [
                'description' => 'A task without a title',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('title');
    }

    public function test_invalid_task_status_is_rejected(): void {
        $user = User::factory()->create();

        $this->actingAs($user, 'api')
            ->postJson('/tasks', [
                'title' => 'Invalid Status Task',
                'status' => 'Unknown',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_user_can_search_tasks_by_title(): void {
        $user = User::factory()->create();

        Task::factory()->create([
            'user_id' => $user->id,
            'title' => 'Prepare Laravel Interview',
        ]);

        Task::factory()->create([
            'user_id' => $user->id,
            'title' => 'Buy Groceries',
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/tasks?search=Laravel');

        $response->assertOk()
            ->assertJsonFragment([
                'title' => 'Prepare Laravel Interview',
            ])
            ->assertJsonMissing([
                'title' => 'Buy Groceries',
            ]);
    }

    public function test_user_can_filter_tasks_by_status(): void {
        $user = User::factory()->create();

        Task::factory()->create([
            'user_id' => $user->id,
            'title' => 'Pending Task',
            'status' => 'Pending',
        ]);

        Task::factory()->create([
            'user_id' => $user->id,
            'title' => 'Completed Task',
            'status' => 'Completed',
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/tasks?status=Pending');

        $response->assertOk()
            ->assertJsonFragment([
                'title' => 'Pending Task',
                'status' => 'Pending',
            ])
            ->assertJsonMissing([
                'title' => 'Completed Task',
            ]);
    }

    public function test_task_results_are_paginated(): void {
        $user = User::factory()->create();

        Task::factory()->count(12)->create([
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user, 'api')
            ->getJson('/tasks');

        $response->assertOk()
            ->assertJsonPath('per_page', 10)
            ->assertJsonPath('total', 12)
            ->assertJsonPath('current_page', 1);

        $this->assertCount(
            10,
            $response->json('data')
        );
    }

    public function test_user_cannot_update_another_users_task(): void {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $task = Task::factory()->create([
            'user_id' => $otherUser->id,
            'title' => 'Private Task',
        ]);

        $this->actingAs($user, 'api')
            ->patchJson("/tasks/{$task->id}", [
                'title' => 'Unauthorized Update',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'title' => 'Private Task',
        ]);
    }

    public function test_user_cannot_delete_another_users_task(): void {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $task = Task::factory()->create([
            'user_id' => $otherUser->id,
        ]);

        $this->actingAs($user, 'api')
            ->deleteJson("/tasks/{$task->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
        ]);
    }

    public function test_admin_can_list_users(): void {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $user = User::factory()->create([
            'role' => 'user',
        ]);

        $token = auth('api')->login($admin);

        $response = $this->withToken($token)->getJson('/users');

        $response->assertOk()
            ->assertJsonStructure([
                'users' => [
                    '*' => ['id', 'name', 'email', 'role'],
                ],
            ])
            ->assertJsonFragment([
                'id' => $user->id,
                'email' => $user->email,
            ]);
    }

    public function test_regular_user_cannot_list_users(): void {
        $user = User::factory()->create([
            'role' => 'user',
        ]);

        $token = auth('api')->login($user);

        $this->withToken($token)
            ->getJson('/users')
            ->assertForbidden();
    }

    public function test_unauthenticated_user_cannot_list_users(): void {
        $this->getJson('/users')
            ->assertUnauthorized();
    }

    public function test_admin_can_assign_task_to_another_user(): void {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $user = User::factory()->create([
            'role' => 'user',
        ]);

        $token = auth('api')->login($admin);

        $response = $this->withToken($token)->postJson('/tasks', [
            'title' => 'Task assigned by admin',
            'description' => 'Assigned to another user',
            'status' => 'Pending',
            'user_id' => $user->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('task.user_id', $user->id);
    }

    public function test_admin_can_create_task_for_themselves_by_default(): void {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $token = auth('api')->login($admin);

        $response = $this->withToken($token)->postJson('/tasks', [
            'title' => 'Admin personal task',
            'description' => 'Created without an assignee',
            'status' => 'Pending',
        ]);

        $response->assertCreated()
            ->assertJsonPath('task.user_id', $admin->id);
    }

    public function test_regular_user_cannot_assign_task_to_another_user(): void {
        $user = User::factory()->create([
            'role' => 'user',
        ]);

        $anotherUser = User::factory()->create([
            'role' => 'user',
        ]);

        $token = auth('api')->login($user);

        $this->withToken($token)->postJson('/tasks', [
            'title' => 'Unauthorized assignment',
            'description' => 'Should not be created',
            'status' => 'Pending',
            'user_id' => $anotherUser->id,
        ])->assertForbidden();
    }
}
