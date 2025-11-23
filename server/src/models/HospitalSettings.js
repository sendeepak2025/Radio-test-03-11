const mongoose = require('mongoose')

const HospitalSettingsSchema = new mongoose.Schema({
  hospitalId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  logoUrl: { type: String },
  settings: {
    allowedIPs: [String],
    requireMFA: { type: Boolean, default: false },
    dataRetentionDays: { type: Number, default: 2555 },
    autoBackup: { type: Boolean, default: true },
    allowDataSharing: { type: Boolean, default: false }
  }
}, { timestamps: true })

HospitalSettingsSchema.index({ hospitalId: 1 }, { unique: true })

module.exports = mongoose.model('HospitalSettings', HospitalSettingsSchema)