
from django.contrib import admin
from django.urls import path

from tasks.views import (
    register,
    login,
    logout,
    task_list,
    task_detail,
)


urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/register/", register, name="register"),
    path("api/login/", login, name="login"),
    path("api/logout/", logout, name="logout"),

    path("api/tasks/", task_list, name="task_list"),
    path("api/tasks/<int:task_id>/", task_detail, name="task_detail"),
]
