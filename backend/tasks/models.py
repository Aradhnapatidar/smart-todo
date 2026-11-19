
from django.conf import settings
from django.db import models


class Task(models.Model):
    CATEGORY_CHOICES = [
        ("Personal", "Personal"),
        ("Work", "Work"),
        ("Study", "Study"),
        ("Health", "Health"),
        ("Other", "Other"),
    ]

    PRIORITY_CHOICES = [
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks",
        null=True,
        blank=True
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    reminder_at = models.DateTimeField(null=True, blank=True)

    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default="medium"
    )

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default="Personal"
    )

    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
