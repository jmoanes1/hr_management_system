"""Performance management forms."""

from django import forms

from accounts.forms import StyledFormMixin
from performance.models import EmployeeGoal, PerformanceReview


class PerformanceReviewForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = PerformanceReview
        fields = [
            "employee", "review_period", "period_start", "period_end",
            "overall_rating", "strengths", "areas_for_improvement",
            "goals_summary", "manager_feedback", "status",
        ]
        labels = {
            "review_period": "Period",
            "period_start": "Start",
            "period_end": "End",
            "overall_rating": "Rating",
            "areas_for_improvement": "Improvements",
            "goals_summary": "Goals",
            "manager_feedback": "Feedback",
        }
        widgets = {
            "period_start": forms.DateInput(attrs={"type": "date"}),
            "period_end": forms.DateInput(attrs={"type": "date"}),
            "strengths": forms.Textarea(attrs={"rows": 3}),
            "areas_for_improvement": forms.Textarea(attrs={"rows": 3}),
            "goals_summary": forms.Textarea(attrs={"rows": 3}),
            "manager_feedback": forms.Textarea(attrs={"rows": 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["review_period"].widget.attrs["placeholder"] = "e.g. Q1 2026"


class EmployeeGoalForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = EmployeeGoal
        fields = ["employee", "title", "description", "target_date", "progress", "status"]
        labels = {
            "target_date": "Due",
        }
        widgets = {
            "description": forms.Textarea(attrs={"rows": 3}),
            "target_date": forms.DateInput(attrs={"type": "date"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["title"].widget.attrs["placeholder"] = "Goal or KPI name"
