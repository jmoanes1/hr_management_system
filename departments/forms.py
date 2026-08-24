"""Department forms."""

from django import forms

from accounts.forms import StyledFormMixin
from departments.models import Department
from employees.models import Employee


class DepartmentForm(StyledFormMixin, forms.ModelForm):
    class Meta:
        model = Department
        fields = ["name", "code", "description", "head", "is_active"]
        labels = {
            "head": "Head",
            "is_active": "Active",
        }
        widgets = {
            "description": forms.Textarea(attrs={"rows": 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["head"].queryset = Employee.objects.filter(is_active=True).order_by("last_name")
        self.fields["head"].empty_label = "No department head"
        self.fields["code"].required = False
        # Mixin already set a label-based placeholder; replace with clearer copy.
        self.fields["name"].widget.attrs["placeholder"] = "Department name"
        self.fields["code"].widget.attrs["placeholder"] = "Optional code"
        self.fields["description"].widget.attrs["placeholder"] = "What this team does"
