from django.contrib import admin
from django.urls import path
from tasks.views import task_list, task_detail

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/tasks/", task_list, name="task_list"),
    path("api/tasks/<int:task_id>/", task_detail, name="task_detail"),
]
