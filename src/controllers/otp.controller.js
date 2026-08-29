import otpGenerator from 'otp-generator';
import nodemailer from 'nodemailer';
import { OTP, express } from '../models/otp.model.js';
import bcrypt from 'bcrypt';

const app = express();

// بعمل ال  endpoint  اللي الفرونت اند هيبعت عليه الايميل عشان ي generate ال OTP

app.post('/generate-otp', async (req, res) => {
    const { email } = req.body;

    const otp = otpGenerator.generate(6, {
        digits: true,
        alphabets: false,
        upperCase: false,
        specialChars: false,
    });

    try {
        //  بيمسح كل ال OTPs اللي موجوده قبل كده عشان ميحصلش تكرار

        await OTP.deleteMany({ email });

        // بيشفر الكود

        const hashedOtp = await bcrypt.hash(otp, 10);

        await OTP.create({ email, otp: hashedOtp });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'your-mail@gmail.com',
                pass: 'your-app-password',
            },
        });

        await transporter.sendMail({
            from: 'your-mail@gmail.com',
            to: email,
            subject: 'OTP Verification',
            text: `Your OTP for verification is: ${otp}`,
        });

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sending OTP' });
    }
});

// بعمل ال endpoint اللي الفرونت اند هيبعت عليه الايميل و ال OTP عشان يتأكد من صحه ال OTP

app.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const otpRecord = await OTP.findOne({ email });

        // بيشوف هو موجود اصلا ولا لا

        if (!otpRecord) {
            return res
                .status(400)
                .json({ message: 'OTP expired or not found' });
        }

        // بيشوف اللي مش متهيش زي اللي متهيش اصلا ولا لا

        const isValid = await bcrypt.compare(otp, otpRecord.otp);

        if (!isValid) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // عشان ميتمش اعاده استخدام ال OTP  تاني يا شباب

        await OTP.deleteOne({
            _id: otpRecord._id,
        });

        return res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error(error);

        return res.status(500).json({ message: 'Error verifying OTP' });
    }
});
