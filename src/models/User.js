const mongoose =
  require('mongoose');

const bcrypt =
  require('bcryptjs');

const crypto =
  require('crypto');

const userSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
      },

      password: {
        type: String,
        required: true,
      },

      phone: {
        type: String,
      },

      isVerified: {
        type: Boolean,
        default: false,
      },

      emailVerificationToken: {
        type: String,
      },

      emailVerificationExpires: {
        type: Date,
      },

      resetPasswordToken: {
        type: String,
      },

      resetPasswordExpire: {
        type: Date,
      },

      role: {
        type: String,
        enum: [
          'student',
          'owner',
          'admin',
        ],
        default: 'student',
      },

      // UNIVERSITY RELATION
      university: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'University',
      },

      avatar: {
        type: String,
      },

      profileImage: {
        type: String,
      },

      bio: {
        type: String,
        trim: true,
        maxlength: 500,
      },

      gender: {
        type: String,
        enum: ['Male', 'Female'],
      },
    },
    {
      timestamps: true,
    }
  );

// HASH PASSWORD
userSchema.pre(
  'save',
  async function () {
    if (
      !this.isModified(
        'password'
      )
    ) {
      return;
    }

    const salt =
      await bcrypt.genSalt(10);

    this.password =
      await bcrypt.hash(
        this.password,
        salt
      );
  }
);

// MATCH PASSWORD
userSchema.methods.matchPassword =
  async function (
    enteredPassword
  ) {
    return await bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

// GENERATE EMAIL VERIFICATION TOKEN
userSchema.methods.generateEmailVerificationToken =
  function () {
    const verificationToken =
      crypto
        .randomBytes(32)
        .toString('hex');

    this.emailVerificationToken =
      crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    this.emailVerificationExpires =
      Date.now() + 24 * 60 * 60 * 1000;

    return verificationToken;
  };

module.exports =
  mongoose.model(
    'User',
    userSchema
  );
