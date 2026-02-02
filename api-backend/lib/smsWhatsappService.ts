// Service SMS et WhatsApp pour les rappels
import axios from 'axios';

// Configuration des services
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

export interface SMSData {
  phone: string;
  message: string;
  taskTitle: string;
  daysDiff: number;
}

export interface WhatsAppData {
  phone: string;
  message: string;
  taskTitle: string;
  projectTitle?: string;
  daysDiff: number;
}

/**
 * Envoyer un SMS via Twilio
 */
export async function sendSMS(data: SMSData): Promise<boolean> {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.log(`SMS désactivé - Message pour ${data.phone}: ${data.message}`);
      return false;
    }

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      new URLSearchParams({
        From: TWILIO_PHONE_NUMBER,
        To: data.phone,
        Body: data.message
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log(`✅ SMS envoyé à ${data.phone}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur SMS pour ${data.phone}:`, error);
    return false;
  }
}

/**
 * Envoyer un message WhatsApp via WhatsApp Business API
 */
export async function sendWhatsApp(data: WhatsAppData): Promise<boolean> {
  try {
    if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
      console.log(`WhatsApp désactivé - Message pour ${data.phone}: ${data.message}`);
      return false;
    }

    // Format du numéro pour WhatsApp (sans le +)
    const phoneNumber = data.phone.replace(/[^\d]/g, '');
    
    const response = await axios.post(
      `${WHATSAPP_API_URL}/messages`,
      {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: "text",
        text: {
          body: data.message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ WhatsApp envoyé à ${data.phone}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur WhatsApp pour ${data.phone}:`, error);
    return false;
  }
}

/**
 * Envoyer un rappel de tâche par SMS
 */
export async function sendTaskReminderSMS(phone: string, task: any, daysDiff: number): Promise<boolean> {
  let message = '';
  
  if (daysDiff === 0) {
    message = `🚨 URGENT: La tâche "${task.title}" est due AUJOURD'HUI! Connectez-vous pour la compléter.`;
  } else if (daysDiff === 1) {
    message = `⏰ RAPPEL: La tâche "${task.title}" est due DEMAIN. Préparez-vous!`;
  } else {
    message = `📅 Rappel: La tâche "${task.title}" est due dans ${daysDiff} jours.`;
  }

  return await sendSMS({
    phone,
    message,
    taskTitle: task.title,
    daysDiff
  });
}

/**
 * Envoyer un rappel de tâche par WhatsApp
 */
export async function sendTaskReminderWhatsApp(phone: string, task: any, daysDiff: number): Promise<boolean> {
  let message = '';
  
  if (daysDiff === 0) {
    message = `🚨 *URGENT - TÂCHE DUE AUJOURD'HUI* 🚨

📋 *Tâche:* ${task.title}
🏢 *Projet:* ${task.project_title || 'N/A'}
📅 *Échéance:* AUJOURD'HUI

⚠️ Cette tâche doit être complétée aujourd'hui. Connectez-vous à la plateforme pour la marquer comme terminée.

💻 Accédez à votre espace de travail maintenant!`;
  } else if (daysDiff === 1) {
    message = `⏰ *RAPPEL DE TÂCHE* ⏰

📋 *Tâche:* ${task.title}
🏢 *Projet:* ${task.project_title || 'N/A'}
📅 *Échéance:* DEMAIN

🔔 N'oubliez pas de préparer cette tâche qui sera due demain.

💻 Consultez les détails sur la plateforme.`;
  } else {
    message = `📅 *Rappel de tâche*

📋 *Tâche:* ${task.title}
🏢 *Projet:* ${task.project_title || 'N/A'}
📅 *Échéance:* Dans ${daysDiff} jours

🔔 Pensez à organiser votre travail pour respecter cette échéance.`;
  }

  return await sendWhatsApp({
    phone,
    message,
    taskTitle: task.title,
    projectTitle: task.project_title,
    daysDiff
  });
}

/**
 * Formater un numéro de téléphone pour les services internationaux
 */
export function formatPhoneNumber(phone: string, countryCode: string = '+226'): string {
  // Nettoyer le numéro
  let cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Ajouter le code pays si nécessaire
  if (!cleanPhone.startsWith('226') && countryCode === '+226') {
    cleanPhone = '226' + cleanPhone;
  }
  
  return '+' + cleanPhone;
}