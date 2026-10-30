import type { BroadcastConfig, BroadcastKind, BroadcastTemplate } from './eventStore';
import type { Event } from './types';

export const BROADCAST_KINDS: { id: BroadcastKind; label: string; desc: string }[] = [
  { id: 'invitation', label: 'Invitation', desc: 'Invite guests and link them to the RSVP form' },
  { id: 'pass', label: 'RSVP Pass', desc: 'Confirm the seat and send the QR pass' },
  { id: 'reminder', label: 'Reminder', desc: 'Remind guests the day before' },
  { id: 'thankyou', label: 'Thank You', desc: 'Thank guests after the event, share photos' },
  { id: 'winner', label: 'Winner', desc: 'Tell a door prize or game winner they won' },
];

export const BROADCAST_VARIABLES = ['{name}', '{fullname}', '{event}', '{date}', '{time}', '{venue}', '{link}', '{code}', '{number}', '{prize}'];

export function defaultBroadcastTemplates(base: Event): Record<BroadcastKind, BroadcastTemplate> {
  const wedding = base.event_type === 'wedding';
  return {
    invitation: {
      subject: "You're invited — {event}",
      heading: "You're invited",
      message: wedding
        ? 'Dear {name},\n\nWe would love to celebrate with you at {event} on {date}, {time} at {venue}.\n\nPlease let us know if you can come. It takes about a minute.'
        : 'Dear {name},\n\nYou are invited to {event} on {date}, {time} at {venue}.\n\nReserve your seat in about a minute. Your QR pass is issued right after you register.',
      whatsapp: wedding
        ? "Hi {name}! 💌 You're invited to {event} on {date}, {time} at {venue}.\n\nPlease RSVP here: {link}"
        : "Hi {name}, you're invited to {event} on {date}, {time} at {venue}.\n\nRegister here: {link}",
      buttonLabel: wedding ? 'RSVP now' : 'Register now',
      imageUrl: '',
    },
    pass: {
      subject: 'Your pass for {event}',
      heading: "You're on the list",
      message: 'Hi {name},\n\nYour seat is confirmed. Guest No. {number} · Pass {code}.\n\nShow your QR pass at the entrance on {date} from {time}.',
      whatsapp: "Hi {name}, you're confirmed for {event} ✅\nGuest No. {number} · Pass {code}\n\nYour QR pass: {link}",
      buttonLabel: 'Open my QR pass',
      imageUrl: '',
    },
    reminder: {
      subject: 'Tomorrow: {event}',
      heading: 'See you tomorrow',
      message: 'Hi {name},\n\nA quick reminder: {event} is on {date} at {time}, {venue}.\n\nHave your QR pass ready at the door (Pass {code}).',
      whatsapp: 'Hi {name}! ⏰ Reminder: {event} is tomorrow, {date} at {time}, {venue}.\n\nHave your QR pass ready: {link}',
      buttonLabel: 'Open my QR pass',
      imageUrl: '',
    },
    thankyou: {
      subject: 'Thank you for coming to {event}',
      heading: 'Thank you!',
      message: wedding
        ? 'Dear {name},\n\nThank you for celebrating with us at {event}. It meant the world to have you there.\n\nSee and download the photos from the day.'
        : 'Hi {name},\n\nThank you for joining {event}. We hope it was worth your time.\n\nSee and download the photos from the event.',
      whatsapp: 'Thank you for coming to {event}, {name}! 🙏\n\nPhotos from the day: {link}',
      buttonLabel: 'See the photos',
      imageUrl: '',
    },
    winner: {
      subject: 'You won at {event}! 🎉',
      heading: 'Congratulations!',
      message: 'Hi {name},\n\nGreat news: you won {prize} at {event}.\n\nPlease come to the host desk with your QR pass (Guest No. {number}) to collect it.',
      whatsapp: 'Congratulations {name}! 🎉 You won {prize} at {event}.\n\nPlease come to the host desk with your QR pass (Guest No. {number}) to collect it: {link}',
      buttonLabel: 'Open my QR pass',
      imageUrl: '',
    },
  };
}

export function defaultBroadcast(base: Event): BroadcastConfig {
  return {
    channel: 'whatsapp',
    countryCode: '62',
    templates: defaultBroadcastTemplates(base),
    sent: {},
    feedback: {
      on: true,
      title: 'How was {event}?',
      question: base.event_type === 'wedding' ? 'How did you enjoy the day?' : 'How would you rate the event?',
      askComment: true,
      prompt: 'Share your feedback',
      thanks: 'Thank you for your feedback!',
    },
  };
}
