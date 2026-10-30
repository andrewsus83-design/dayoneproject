revoke execute on function
  a41_private.add_creator_as_owner(),
  a41_private.enforce_event_rules(),
  a41_private.enforce_guest_capacity(),
  a41_private.enforce_publish_rules(),
  a41_private.guard_hunt_mission(),
  a41_private.guard_quiz(),
  a41_private.guard_quiz_question(),
  a41_private.guard_raffle_prize(),
  a41_private.mark_guest_checked_in(),
  a41_private.mark_guest_rsvp(),
  a41_private.remember_guest_status(),
  a41_private.restore_guest_status(),
  a41_private.set_updated_at()
from public;