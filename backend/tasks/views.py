import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Task


@csrf_exempt
def task_list(request):
    if request.method == "GET":
        tasks = list(Task.objects.values())
        return JsonResponse(tasks, safe=False)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            task = Task.objects.create(
                title=data.get("title", ""),
                description=data.get("description", ""),
                reminder_at=data.get("reminder_at")
            )
            return JsonResponse({
                "message": "Task created successfully",
                "id": task.id,
                "title": task.title
            }, status=201)
        except (json.JSONDecodeError, TypeError, ValueError):
            return JsonResponse(
                {"error": "Invalid task data"},
                status=400
            )


@csrf_exempt
def task_detail(request, task_id):
    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return JsonResponse({"error": "Task not found"}, status=404)

    if request.method == "PATCH":
        try:
            data = json.loads(request.body)
            if "title" in data:
                task.title = data["title"]
            if "description" in data:
                task.description = data["description"]
            if "is_completed" in data:
                task.is_completed = data["is_completed"]
            task.save()
            return JsonResponse({"message": "Task updated successfully"})
        except (json.JSONDecodeError, TypeError, ValueError):
            return JsonResponse({"error": "Invalid task data"}, status=400)

    if request.method == "DELETE":
        task.delete()
        return JsonResponse({"message": "Task deleted successfully"})

    return JsonResponse({"error": "Method not allowed"}, status=405)
