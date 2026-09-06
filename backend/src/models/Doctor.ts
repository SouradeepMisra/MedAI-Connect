import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    degree: {
      type: String,
      required: true,
    },
    specialization: {
      type: String,
      required: true,
    },
    experience: {
      type: Number,
      required: true,
    },
    loginId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple docs to have no loginId yet, until approved
    },
    password: {
      type: String,
      // no longer "required" up front — self-registered doctors set this
      // themselves as part of registration, but we keep it optional at the
      // schema level in case we later support admin-created doctors too
    },
    documentPath: {
      type: String,
      required: true, // path to the uploaded certificate/registration document
    },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    isActivated: {
      type: Boolean,
      default: false,
    },
    currentMonthLocked: {
      type: Boolean,
      default: false,
    },
    aiVerification: {
      status: {
        type: String,
        enum: ['NotRun', 'Completed', 'Failed'],
        default: 'NotRun',
      },
      modelUsed: String,
      extractedName: String,
      extractedRegistrationNumber: String,
      extractedDegree: String,
      nameMatch: { type: String, enum: ['match', 'mismatch', 'uncertain'] },
      registrationNumberMatch: { type: String, enum: ['match', 'mismatch', 'uncertain'] },
      degreeMatch: { type: String, enum: ['match', 'mismatch', 'uncertain'] },
      concerns: [String],
      summary: String,
      errorMessage: String,
      checkedAt: Date,
      checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    },
  },
  {
    timestamps: true,
  }
);

export const Doctor = mongoose.model('Doctor', doctorSchema);