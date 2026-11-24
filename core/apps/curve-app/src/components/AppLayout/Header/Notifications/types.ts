export interface Notification {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  link: string;
  read: boolean;
  urls: { name: string; url: string }[];
  notificationErrors: string[];
}
