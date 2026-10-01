import { Fraunces, Manrope } from "next/font/google";
import {
  QrCode,
  Wifi,
  MonitorSmartphone,
  Printer,
  LayoutGrid,
  ClipboardList,
  CreditCard,
  History,
  ShieldCheck,
  BarChart3,
  Users,
} from "lucide-react";

export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const groups = [
  {
    label: "Front of house",
    description: "What the guest sees, from the table.",
    items: [
      {
        icon: QrCode,
        title: "QR code table ordering",
        detail:
          "Guests scan the code on their table and order straight from their own phone — no app, no queue.",
      },
      {
        icon: Wifi,
        title: "Real-time order sync",
        detail:
          "The moment an order is placed, it's on every screen and ticket that needs to see it.",
      },
      {
        icon: MonitorSmartphone,
        title: "QR order visibility dashboard",
        detail:
          "Staff can see every table's live order status at a glance, without walking over to ask.",
      },
    ],
  },
  {
    label: "Kitchen & counter",
    description: "What keeps the line moving.",
    items: [
      {
        icon: Printer,
        title: "Automated thermal ticketing",
        detail:
          "Orders print straight to the kitchen printer over ESC/POS — no tablet mounted above the stove.",
      },
      {
        icon: LayoutGrid,
        title: "Dynamic menu management",
        detail:
          "Sell out of the bulalo? Pull it from every table's menu in seconds, not at the next reprint.",
      },
      {
        icon: ClipboardList,
        title: "Inline & counter encoding",
        detail:
          "Walk-ins and phone orders get entered the same way QR orders do, so nothing runs on a separate list.",
      },
    ],
  },
  {
    label: "Back office",
    description: "What the owner checks at closing.",
    items: [
      {
        icon: CreditCard,
        title: "Payment & digital receipts",
        detail: "Take payment at the table or counter and send a receipt without printing paper.",
      },
      {
        icon: History,
        title: "Voids with audit logging",
        detail: "Every cancelled order is logged with who did it and why — nothing quietly disappears.",
      },
      {
        icon: ShieldCheck,
        title: "Role-based access",
        detail: "Cashiers, kitchen staff, and managers each see only what their role needs to.",
      },
      {
        icon: BarChart3,
        title: "Sales reporting & analytics",
        detail: "Know your best-selling dish and slowest hour without exporting a spreadsheet.",
      },
      {
        icon: Users,
        title: "Employee management",
        detail: "Shifts, roles, and staff records live in the same system as the orders they take.",
      },
    ],
  },
];

export const steps = [
  {
    n: "01",
    title: "Guest scans the table code",
    detail: "The menu opens on their own phone — already set to their table number.",
  },
  {
    n: "02",
    title: "Order lands on every screen at once",
    detail: "Front counter, dashboard, and kitchen queue all update in real time.",
  },
  {
    n: "03",
    title: "Kitchen gets a printed ticket",
    detail: "No tablet required — the ESC/POS printer fires off the order like it always has.",
  },
  {
    n: "04",
    title: "Guest pays, receipt sent digitally",
    detail: "Closing the table takes one action, and the paper trail is optional.",
  },
];

export const comparison = [
  {
    before: "Orders scribbled on paper get lost between the table and the kitchen.",
    after: "Orders sync in real time, straight through to a printed kitchen ticket.",
  },
  {
    before: "Staff walk the floor to check which tables have been served.",
    after: "One dashboard shows every table's order status, live.",
  },
  {
    before: "A menu change means reprinting menus for every table.",
    after: "Update a dish once — it updates on every table's screen at the same time.",
  },
  {
    before: "A voided order is just whatever the cashier says happened.",
    after: "Every void is logged with who did it, when, and why.",
  },
  {
    before: "Sales numbers only show up at closing, added up by hand.",
    after: "A live dashboard tracks sales as the shift happens.",
  },
];

export const specs = [
  {
    label: "Order sync",
    value: "Real-time channel between guest, counter, and kitchen — no manual refresh.",
  },
  {
    label: "Ticketing",
    value: "ESC/POS thermal printer protocol — works with printers you likely already own.",
  },
  {
    label: "Access control",
    value: "Role-based permissions for admin, cashier, kitchen, and manager accounts.",
  },
  {
    label: "Audit trail",
    value: "Every void, edit, and payment is timestamped and attributed to a user.",
  },
  {
    label: "Menu state",
    value: "Centralized menu data, so one edit reflects across QR, counter, and dashboard at once.",
  },
];

export const faqs = [
  {
    q: "Do we need to replace our existing printer?",
    a: "No. As long as it supports ESC/POS — which most thermal receipt printers do — PRIME prints tickets straight to it.",
  },
  {
    q: "What happens if the internet drops mid-shift?",
    a: "PRIME is built to run on your restaurant's own local network rather than depend on the public internet, but order sync does need that local connection to stay up.",
  },
  {
    q: "Can different staff see different things?",
    a: "Yes. Role-based access means a cashier, a kitchen staff member, and a manager each get a view suited to their job, not the full system.",
  },
  {
    q: "How are voided orders tracked?",
    a: "Every void or cancellation is logged with the staff member, the time, and a reason, so nothing disappears without a record.",
  },
  {
    q: "Is PRIME built for a specific kind of restaurant?",
    a: "It's designed around small to mid-sized restaurants that already run on a printed kitchen ticket, and want QR ordering added on top of that — not a full hardware replacement.",
  },
];