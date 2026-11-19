
from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):

    class Meta:
        model = Task

        fields = [
            "id",
            "title",
            "description",
            "due_date",
            "reminder_at",
            "priority",
            "category",
            "is_completed",
            "created_at",
        ]

        read_only_fields = ["id", "created_at"]
