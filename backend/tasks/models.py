
from django.db import models


class Task(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    reminder_at = models.DateTimeField(null=True, blank=True)

    priority = models.CharField(
        max_length=10,
        choices=[
            ("high", "High"),
            ("medium", "Medium"),
            ("low", "Low"),
        ],
        default="medium"
    )

    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
