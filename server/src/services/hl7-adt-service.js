/**
 * HL7 ADT Message Parser Service
 * Handles HL7 v2.x ADT (Admission, Discharge, Transfer) messages
 */

const HL7 = require('hl7-standard');

class HL7ADTService {
  constructor() {
    this.hl7 = new HL7();
  }

  /**
   * Parse HL7 ADT message
   * @param {string} hl7Message - Raw HL7 message
   * @returns {Object} Parsed patient data
   */
  parseADTMessage(hl7Message) {
    try {
      const message = this.hl7.parse(hl7Message);
      const messageType = this.getMessageType(message);

      switch (messageType) {
        case 'A01': // Patient Admit
          return this.parseAdmitMessage(message);
        case 'A08': // Patient Update
          return this.parseUpdateMessage(message);
        case 'A11': // Patient Discharge
          return this.parseDischargeMessage(message);
        case 'A04': // Patient Registration
          return this.parseRegistrationMessage(message);
        default:
          throw new Error(`Unsupported message type: ${messageType}`);
      }
    } catch (error) {
      console.error('Error parsing HL7 message:', error);
      throw error;
    }
  }

  /**
   * Get message type from MSH segment
   */
  getMessageType(message) {
    const msh = message.get('MSH');
    const messageTypeField = msh.get('MSH.9');
    return messageTypeField ? messageTypeField.toString().split('^')[1] : null;
  }

  /**
   * Parse A01 - Patient Admit
   */
  parseAdmitMessage(message) {
    return {
      messageType: 'A01',
      eventType: 'admit',
      patient: this.extractPatientData(message),
      visit: this.extractVisitData(message),
      insurance: this.extractInsuranceData(message),
      nextOfKin: this.extractNextOfKinData(message),
      timestamp: this.extractTimestamp(message)
    };
  }

  /**
   * Parse A08 - Patient Update
   */
  parseUpdateMessage(message) {
    return {
      messageType: 'A08',
      eventType: 'update',
      patient: this.extractPatientData(message),
      visit: this.extractVisitData(message),
      timestamp: this.extractTimestamp(message)
    };
  }

  /**
   * Parse A11 - Patient Discharge
   */
  parseDischargeMessage(message) {
    return {
      messageType: 'A11',
      eventType: 'discharge',
      patient: this.extractPatientData(message),
      visit: this.extractVisitData(message),
      dischargeInfo: this.extractDischargeData(message),
      timestamp: this.extractTimestamp(message)
    };
  }

  /**
   * Parse A04 - Patient Registration
   */
  parseRegistrationMessage(message) {
    return {
      messageType: 'A04',
      eventType: 'registration',
      patient: this.extractPatientData(message),
      visit: this.extractVisitData(message),
      timestamp: this.extractTimestamp(message)
    };
  }

  /**
   * Extract patient demographic data from PID segment
   */
  extractPatientData(message) {
    const pid = message.get('PID');
    if (!pid) return null;

    return {
      patientId: this.getField(pid, 'PID.3'), // Patient ID (MRN)
      externalId: this.getField(pid, 'PID.2'), // External ID
      name: this.parsePatientName(pid),
      dateOfBirth: this.parseDate(this.getField(pid, 'PID.7')),
      gender: this.getField(pid, 'PID.8'),
      race: this.getField(pid, 'PID.10'),
      address: this.parseAddress(pid),
      phone: this.getField(pid, 'PID.13'),
      email: this.getField(pid, 'PID.13', 1), // Sometimes email in second phone field
      maritalStatus: this.getField(pid, 'PID.16'),
      ssn: this.getField(pid, 'PID.19')
    };
  }

  /**
   * Parse patient name from PID.5
   */
  parsePatientName(pid) {
    const nameField = this.getField(pid, 'PID.5');
    if (!nameField) return null;

    const parts = nameField.split('^');
    return {
      lastName: parts[0] || '',
      firstName: parts[1] || '',
      middleName: parts[2] || '',
      suffix: parts[3] || '',
      prefix: parts[4] || '',
      fullName: `${parts[1] || ''} ${parts[2] || ''} ${parts[0] || ''}`.trim()
    };
  }

  /**
   * Parse address from PID.11
   */
  parseAddress(pid) {
    const addressField = this.getField(pid, 'PID.11');
    if (!addressField) return null;

    const parts = addressField.split('^');
    return {
      street: parts[0] || '',
      street2: parts[1] || '',
      city: parts[2] || '',
      state: parts[3] || '',
      zip: parts[4] || '',
      country: parts[5] || ''
    };
  }

  /**
   * Extract visit/encounter data from PV1 segment
   */
  extractVisitData(message) {
    const pv1 = message.get('PV1');
    if (!pv1) return null;

    return {
      visitNumber: this.getField(pv1, 'PV1.19'),
      patientClass: this.getField(pv1, 'PV1.2'), // I=Inpatient, O=Outpatient, E=Emergency
      assignedLocation: this.parseLocation(pv1),
      admitDateTime: this.parseDateTime(this.getField(pv1, 'PV1.44')),
      attendingDoctor: this.parseDoctor(pv1, 'PV1.7'),
      referringDoctor: this.parseDoctor(pv1, 'PV1.8'),
      admitSource: this.getField(pv1, 'PV1.14'),
      hospitalService: this.getField(pv1, 'PV1.10')
    };
  }

  /**
   * Parse location from PV1.3
   */
  parseLocation(pv1) {
    const locationField = this.getField(pv1, 'PV1.3');
    if (!locationField) return null;

    const parts = locationField.split('^');
    return {
      facility: parts[0] || '',
      building: parts[1] || '',
      floor: parts[2] || '',
      room: parts[3] || '',
      bed: parts[4] || ''
    };
  }

  /**
   * Parse doctor information
   */
  parseDoctor(segment, fieldId) {
    const doctorField = this.getField(segment, fieldId);
    if (!doctorField) return null;

    const parts = doctorField.split('^');
    return {
      id: parts[0] || '',
      lastName: parts[1] || '',
      firstName: parts[2] || '',
      middleName: parts[3] || '',
      fullName: `${parts[2] || ''} ${parts[1] || ''}`.trim()
    };
  }

  /**
   * Extract insurance data from IN1 segment
   */
  extractInsuranceData(message) {
    const in1 = message.get('IN1');
    if (!in1) return null;

    return {
      planId: this.getField(in1, 'IN1.2'),
      companyId: this.getField(in1, 'IN1.3'),
      companyName: this.getField(in1, 'IN1.4'),
      groupNumber: this.getField(in1, 'IN1.8'),
      planType: this.getField(in1, 'IN1.15'),
      policyNumber: this.getField(in1, 'IN1.36')
    };
  }

  /**
   * Extract next of kin data from NK1 segment
   */
  extractNextOfKinData(message) {
    const nk1 = message.get('NK1');
    if (!nk1) return null;

    const nameField = this.getField(nk1, 'NK1.2');
    const nameParts = nameField ? nameField.split('^') : [];

    return {
      name: {
        lastName: nameParts[0] || '',
        firstName: nameParts[1] || '',
        fullName: `${nameParts[1] || ''} ${nameParts[0] || ''}`.trim()
      },
      relationship: this.getField(nk1, 'NK1.3'),
      phone: this.getField(nk1, 'NK1.5'),
      address: this.getField(nk1, 'NK1.4')
    };
  }

  /**
   * Extract discharge information
   */
  extractDischargeData(message) {
    const pv1 = message.get('PV1');
    if (!pv1) return null;

    return {
      dischargeDateTime: this.parseDateTime(this.getField(pv1, 'PV1.45')),
      dischargeDisposition: this.getField(pv1, 'PV1.36'),
      dischargeLocation: this.getField(pv1, 'PV1.37')
    };
  }

  /**
   * Extract timestamp from MSH segment
   */
  extractTimestamp(message) {
    const msh = message.get('MSH');
    const timestampField = this.getField(msh, 'MSH.7');
    return this.parseDateTime(timestampField);
  }

  /**
   * Get field value from segment
   */
  getField(segment, fieldId, index = 0) {
    try {
      const field = segment.get(fieldId);
      if (!field) return null;
      
      const value = field.toString();
      if (index > 0) {
        const parts = value.split('~');
        return parts[index] || null;
      }
      return value;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse HL7 date (YYYYMMDD)
   */
  parseDate(dateString) {
    if (!dateString || dateString.length < 8) return null;

    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);

    return new Date(`${year}-${month}-${day}`);
  }

  /**
   * Parse HL7 datetime (YYYYMMDDHHMMSS)
   */
  parseDateTime(datetimeString) {
    if (!datetimeString || datetimeString.length < 8) return null;

    const year = datetimeString.substring(0, 4);
    const month = datetimeString.substring(4, 6);
    const day = datetimeString.substring(6, 8);
    const hour = datetimeString.substring(8, 10) || '00';
    const minute = datetimeString.substring(10, 12) || '00';
    const second = datetimeString.substring(12, 14) || '00';

    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }

  /**
   * Generate HL7 ACK (Acknowledgment) message
   */
  generateACK(originalMessage, status = 'AA') {
    const msh = originalMessage.get('MSH');
    const messageControlId = this.getField(msh, 'MSH.10');
    const sendingApp = this.getField(msh, 'MSH.3');
    const sendingFacility = this.getField(msh, 'MSH.4');

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);

    return `MSH|^~\\&|RadiologySystem|Hospital|${sendingApp}|${sendingFacility}|${timestamp}||ACK|${messageControlId}|P|2.5\r` +
           `MSA|${status}|${messageControlId}\r`;
  }
}

module.exports = new HL7ADTService();
