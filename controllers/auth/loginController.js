import Joi from "joi";
import { RefreshToken, User } from "../../models";
import CustomErrorHandler from "../../services/CustomErrorHandler";
import JwtService from "../../services/JWTService";
import bcrypt from 'bcrypt';
import { REFRESH_SECRET } from "../../config";


const loginController = {
    async login(req, res, next) {
        // ? Create schema for validation
        const loginSchema = Joi.object({
            email: Joi.string().email().required(),

            password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required(),
        });

        const { error } = loginSchema.validate(req.body)

        if (error) {
            return next(error);
        }

        // ? check if user already in database
        try {
            const user = await User.findOne({ email: req.body.email })
            if (!user) {
                return next(CustomErrorHandler.wrongCredentials());
            }

            //? compare the password
            const match = await bcrypt.compare(req.body.password, user.password)
            if (!match) {
                return next(CustomErrorHandler.wrongCredentials());
            }

            //? Token generate
            const access_token = JwtService.sign({ _id: user._id, role: user.role })

            const refresh_token = JwtService.sign({ _id: user._id, role: user.role }, '1y', REFRESH_SECRET)

            // ? Database whitelist
            await RefreshToken.create({ token: refresh_token })
            res.json({ access_token, refresh_token })
        } catch (error) {
            return next(error);
        }

    },

    async logout(req, res, next) {
        // ?validation
        const refreshSchema = Joi.object({
            refresh_token: Joi.string().required(),
        });

        const { error } = refreshSchema.validate(req.body)

        if (error) {
            return next(error);
        }
        try {
            await RefreshToken.deleteOne({ token: req.body.refresh_token })
        } catch (error) {
            return next(new Error("something went wrong in database"));
        }
        res.json({ status: 1 })
    }
}

export default loginController;