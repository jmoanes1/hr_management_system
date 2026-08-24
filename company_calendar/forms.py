"""Forms for company calendar management."""

from django import forms

from accounts.forms import StyledFormMixin
from company_calendar.models import CalendarEntry


class CalendarEntryForm(StyledFormMixin, forms.ModelForm):
    """Create and edit calendar entries."""

    class Meta:
        model = CalendarEntry
        fields = ["title", "date", "event_type", "description", "is_active"]
        labels = {
            "event_type": "Type",
            "is_active": "Show on calendar",
        }
        widgets = {
            "date": forms.DateInput(attrs={"type": "date"}),
            "description": forms.Textarea(attrs={"rows": 3}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Mixin already set a label-based placeholder; replace with clearer copy.
        self.fields["title"].widget.attrs["placeholder"] = "Holiday or event name"
        self.fields["description"].widget.attrs["placeholder"] = "Optional details for employees"
