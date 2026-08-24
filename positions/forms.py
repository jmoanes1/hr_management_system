"""Position forms."""

from django import forms

from accounts.forms import StyledFormMixin
from departments.models import Department
from positions.models import Position


class PositionForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Position
        fields = ["title", "department", "description", "is_active"]
        labels = {
            "is_active": "Active",
        }
        widgets = {
            "description": forms.Textarea(attrs={"rows": 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["department"].queryset = Department.objects.filter(is_active=True).order_by("name")
        # Mixin already set a label-based placeholder; replace with clearer copy.
        self.fields["title"].widget.attrs["placeholder"] = "Role title"
        self.fields["description"].widget.attrs["placeholder"] = "What this role does"
