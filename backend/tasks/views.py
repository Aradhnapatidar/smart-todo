
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Task
from .serializers import TaskSerializer


User = get_user_model()


# USER REGISTRATION
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def register(request):

    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")
    email = request.data.get("email", "").strip()

    if not username or not password:
        return Response(
            {"error": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already exists."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        validate_password(password)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        token, created = Token.objects.get_or_create(user=user)

        return Response({
            "message": "Account created successfully.",
            "token": token.key,
            "username": user.username
        }, status=status.HTTP_201_CREATED)

    except Exception as error:
        return Response(
            {"error": str(error)},
            status=status.HTTP_400_BAD_REQUEST
        )


# USER LOGIN
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):

    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    user = authenticate(
        request,
        username=username,
        password=password
    )

    if user is None:
        return Response(
            {"error": "Invalid username or password."},
            status=status.HTTP_400_BAD_REQUEST
        )

    token, created = Token.objects.get_or_create(user=user)

    return Response({
        "message": "Login successful.",
        "token": token.key,
        "username": user.username
    })


# USER LOGOUT
@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def logout(request):

    request.user.auth_token.delete()

    return Response({
        "message": "Logout successful."
    })


# TASK LIST AND CREATE
@api_view(["GET", "POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def task_list(request):

    if request.method == "GET":

        tasks = Task.objects.filter(
            user=request.user
        ).order_by("-created_at")

        serializer = TaskSerializer(tasks, many=True)

        return Response(serializer.data)

    if request.method == "POST":

        serializer = TaskSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(user=request.user)

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# TASK DETAIL, UPDATE AND DELETE
@api_view(["GET", "PATCH", "DELETE"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def task_detail(request, task_id):

    task = get_object_or_404(
        Task,
        id=task_id,
        user=request.user
    )

    if request.method == "GET":

        serializer = TaskSerializer(task)

        return Response(serializer.data)

    if request.method == "PATCH":

        serializer = TaskSerializer(
            task,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()

            return Response(serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    if request.method == "DELETE":

        task.delete()

        return Response(
            {"message": "Task deleted successfully."},
            status=status.HTTP_200_OK
        )
