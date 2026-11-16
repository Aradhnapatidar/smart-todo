
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Task


def task_data(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "due_date": task.due_date,
        "reminder_at": task.reminder_at,
        "priority": task.priority,
        "is_completed": task.is_completed,
        "created_at": task.created_at,
    }


@csrf_exempt
def task_list(request):

    if request.method == "GET":
        tasks = [task_data(task) for task in Task.objects.all()]
        return JsonResponse(tasks, safe=False)

    if request.method == "POST":
        try:
            data = json.loads(request.body)

            task = Task.objects.create(
                title=data.get("title", ""),
                description=data.get("description", ""),
                reminder_at=data.get("reminder_at"),
                priority=data.get("priority", "medium")
            )

            return JsonResponse(task_data(task), status=201)

        except (json.JSONDecodeError, TypeError, ValueError):
            return JsonResponse(
                {"error": "Invalid task data"},
                status=400
            )

    return JsonResponse(
        {"error": "Method not allowed"},
        status=405
    )


@csrf_exempt
def task_detail(request, task_id):

    try:
        task = Task.objects.get(id=task_id)

    except Task.DoesNotExist:
        return JsonResponse(
            {"error": "Task not found"},
            status=404
        )

    if request.method == "GET":
        return JsonResponse(task_data(task))

    if request.method == "PATCH":
        try:
            data = json.loads(request.body)

            if "title" in data:
                task.title = data["title"]

            if "description" in data:
                task.description = data["description"]

            if "is_completed" in data:
                task.is_completed = data["is_completed"]

            if "priority" in data:
                task.priority = data["priority"]

            task.save()

            return JsonResponse(task_data(task))

        except (json.JSONDecodeError, TypeError, ValueError):
            return JsonResponse(
                {"error": "Invalid task data"},
                status=400
            )

    if request.method == "DELETE":
        task.delete()

        return JsonResponse({
            "message": "Task deleted successfully"
        })

    return JsonResponse(
        {"error": "Method not allowed"},
        status=405
    )
