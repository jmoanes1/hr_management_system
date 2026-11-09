"""Attendance URL routes."""

from django.urls import path

from attendance import views

app_name = "attendance"

urlpatterns = [
    path("", views.attendance_dashboard, name="dashboard"),
    path("punch/", views.attendance_punch, name="punch"),
    path("timesheet/", views.timesheet_view, name="timesheet"),
    path("leave/", views.leave_list_view, name="leave_list"),
    path("leave/request/", views.leave_request_view, name="leave_request"),
    path("api/leave-balances/<int:employee_id>/", views.leave_balances_api, name="leave_balances_api"),
    path("leave/<int:pk>/review/", views.leave_review_view, name="leave_review"),
    path("report/", views.attendance_report_view, name="report"),
    path("leave-types/", views.leave_type_list, name="leave_type_list"),
    path("leave-types/new/", views.leave_type_create, name="leave_type_create"),
    path("leave-types/<int:pk>/edit/", views.leave_type_edit, name="leave_type_edit"),
    path("leave-types/<int:pk>/delete/", views.leave_type_delete, name="leave_type_delete"),
]
