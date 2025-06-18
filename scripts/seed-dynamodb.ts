#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { FlowConfig } from '../backend/shared/models';

// Get table name from environment or use default
const tableName = 'cxbuilder-flow-config';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Sample FlowConfig data
const sampleFlowConfigs: FlowConfig[] = [
  {
    id: 'customer-service-queue',
    description: 'Main customer service queue configuration',
    variables: {
      closure: 'false',
      offerCallback: 'true',
      priority: 'high',
      maxWaitTime: '300',
      businessHours: 'true',
    },
    prompts: {
      welcome: {
        'en-US': {
          voice:
            'Thank you for calling customer service. How can I help you today?',
          chat: 'Hi! Welcome to customer service. How can I assist you?',
        },
        'es-US': {
          voice:
            'Gracias por llamar al servicio al cliente. ¿Cómo puedo ayudarte hoy?',
          chat: '¡Hola! Bienvenido al servicio al cliente. ¿Cómo puedo ayudarte?',
        },
      },
      hold: {
        'en-US': {
          voice: 'Please hold while I connect you to the next available agent.',
        },
        'es-US': {
          voice:
            'Por favor espere mientras lo conecto con el próximo agente disponible.',
        },
      },
      closure: {
        'en-US': {
          voice:
            'We are currently closed. Our business hours are Monday through Friday, 9 AM to 5 PM.',
        },
        'es-US': {
          voice:
            'Actualmente estamos cerrados. Nuestro horario comercial es de lunes a viernes, de 9 AM a 5 PM.',
        },
      },
    },
  },
  {
    id: 'technical-support-queue',
    description: 'Technical support queue for product issues',
    variables: {
      closure: 'false',
      offerCallback: 'true',
      priority: 'medium',
      maxWaitTime: '600',
      skillLevel: 'advanced',
    },
    prompts: {
      welcome: {
        'en-US': {
          voice:
            'Welcome to technical support. Please describe your technical issue and we will assist you.',
          chat: 'Welcome to tech support! Please describe your issue.',
        },
      },
      hold: {
        'en-US': {
          voice:
            'Your call is important to us. Please continue to hold for the next available technical support specialist.',
        },
      },
      troubleshooting: {
        'en-US': {
          voice:
            'Before we continue, have you tried turning your device off and on again?',
          chat: 'Quick question - have you tried restarting your device?',
        },
      },
    },
  },
  {
    id: 'sales-inquiry-flow',
    description: 'Sales inquiry and product information flow',
    variables: {
      closure: 'false',
      offerCallback: 'false',
      priority: 'low',
      leadCapture: 'true',
      productCatalog: 'enabled',
    },
    prompts: {
      welcome: {
        'en-US': {
          voice:
            'Thank you for your interest in our products. A sales representative will be with you shortly.',
          chat: 'Thanks for your interest! A sales rep will chat with you soon.',
        },
        'es-US': {
          voice:
            'Gracias por su interés en nuestros productos. Un representante de ventas estará con usted en breve.',
          chat: '¡Gracias por su interés! Un representante de ventas charlará con usted pronto.',
        },
      },
      pricing: {
        'en-US': {
          voice:
            'For detailed pricing information, please speak with one of our sales specialists.',
          chat: 'For pricing details, please speak with our sales team.',
        },
      },
    },
  },
  {
    id: 'after-hours-flow',
    description: 'After hours and emergency contact flow',
    variables: {
      closure: 'true',
      offerCallback: 'true',
      priority: 'high',
      emergency: 'true',
      businessHours: 'false',
    },
    prompts: {
      closure: {
        'en-US': {
          voice:
            'Thank you for calling. We are currently closed. For emergencies, press 1. To leave a message, press 2.',
        },
        'es-US': {
          voice:
            'Gracias por llamar. Actualmente estamos cerrados. Para emergencias, presione 1. Para dejar un mensaje, presione 2.',
        },
      },
      emergency: {
        'en-US': {
          voice:
            'You have reached our emergency line. Please hold while we connect you to an on-call representative.',
        },
        'es-US': {
          voice:
            'Ha llegado a nuestra línea de emergencia. Por favor espere mientras lo conectamos con un representante de guardia.',
        },
      },
      voicemail: {
        'en-US': {
          voice:
            'Please leave your name, number, and a brief message after the tone. We will return your call during business hours.',
        },
        'es-US': {
          voice:
            'Por favor deje su nombre, número y un mensaje breve después del tono. Le devolveremos la llamada durante el horario comercial.',
        },
      },
    },
  },
  {
    id: 'billing-support-queue',
    description: 'Billing and account support queue',
    variables: {
      closure: 'false',
      offerCallback: 'true',
      priority: 'medium',
      accountVerification: 'required',
      paymentOptions: 'enabled',
    },
    prompts: {
      welcome: {
        'en-US': {
          voice:
            'Welcome to billing support. For your security, we will need to verify your account information.',
          chat: "Welcome to billing support! We'll need to verify your account first.",
        },
      },
      verification: {
        'en-US': {
          voice:
            'Please provide your account number or the phone number associated with your account.',
          chat: 'Please provide your account number or phone number on file.',
        },
      },
      payment: {
        'en-US': {
          voice:
            'For payment options, press 1. For billing questions, press 2. To speak with an agent, press 0.',
          chat: 'How can I help with your billing today?',
        },
      },
    },
  },
];

async function seedDatabase() {
  console.log(`Seeding DynamoDB table: ${tableName}`);
  console.log(`Region: ${process.env.AWS_REGION || 'us-east-1'}`);

  try {
    for (const flowConfig of sampleFlowConfigs) {
      console.log(`Inserting FlowConfig: ${flowConfig.id}`);

      await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: flowConfig,
        })
      );

      console.log(`✅ Successfully inserted: ${flowConfig.id}`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log(`Inserted ${sampleFlowConfigs.length} FlowConfig records.`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding script
seedDatabase();
