const express = require('express');
const router = express.Router();
const {
    check,
    validationResult
} = require('express-validator/check')
const _ = require('lodash')
const {
    ensureAuthenticated,
    ensureCafe
} = require('../config/auth');
const bcrypt = require('bcryptjs');
const passport = require('passport');
//User model
const User = require('../models/User');
const {
    Model
} = require('mongoose');
const bodyParser = require('body-parser');
const Cafe = require('../models/Cafe').Cafe;
const upload = require('../config/multer_support')
const authService = require('../services/authService_user');
const jwt = require('jsonwebtoken');
const {
    cloudinaryConfig,
    uploader,
    parseImage
} = require('../config/cloudinary_support')
    //working api route is /api/profile

//get request to working api sends back the user document currently logged in
//if not logged in sends 401
router.get('/', ensureAuthenticated, (req, res) => {
    let deepClone = JSON.parse(JSON.stringify(req.user));
    if (req.user.password) {
        delete deepClone.password;
    }
    res.json(deepClone);
});
//provides ability to edit user document details.
router.get('/check', async(req, res) => {
    // if (req.isAuthenticated()) {
    //     return next();
    // }
    // res.status(401).json({
    //     error: 'Unauthorized'
    // })
    const token = req.header('x-auth-token');
    if (!token) res.status(201).json({
        isAuthorized: false
    })
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload.role == 'User') {
            console.log('checking auth as user');
            let workingUser = await User.findOne({
                _id: payload.userId
            })
            if (workingUser) {
                res.status(200).json({
                    isAuthorized: true,
                    user: JSON.stringify(workingUser)
                })
            } else {
                return res.status(201).json({
                    isAuthorized: false
                })
            }
        } else {
            let workingCafe = await Cafe.findOne({
                _id: payload.userId
            })
            if (workingCafe) {
                res.status(200).json({
                    isAuthorized: true,
                    cafe: JSON.stringify(workingCafe)
                })
            } else {
                return res.status(201).json({
                    isAuthorized: false
                })
            }
        }
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: e,
            isAuthorized: false
        })
    }

});
router.patch('/', ensureAuthenticated, (req, res) => {
    if (req.user.role == 'User') {
        //User object
        User.updateOne({
                _id: req.user._id,
            },
            req.body,
            (err, writeOpResult) => {
                if (err) {
                    console.log(err);
                }
                writeOpResult['userType'] = 'User'
                res.json(writeOpResult);
            }
        );

    } else {
        let deepClone = JSON.parse(JSON.stringify(req.body));
        if (req.body.password) {
            deepClone.password = bcrypt.hashSync(deepClone.password, 10)
        }
        Cafe.updateOne({
                    _id: req.user.id,
                },
                deepClone, (err, writeOpResult) => {
                    if (err) {
                        console.log(err);
                    }
                    writeOpResult['userType'] = 'Cafe'
                    res.json(writeOpResult);
                }
            )
            //
    }
})

//api endpoint to register a cafe using local strategy
//sends 200 if success
//the post request data should(or form names) should have (name,email,number,password)
router.post('/register/images', upload.fields([{
    name: 'logoImage',
    maxCount: 1,
}, {
    name: 'cafeImage',
    maxCount: 1,

}]), ensureCafe, async(req, res) => {
    let workingCafe = await Cafe.findOne({
        _id: req.user._id
    });
    const Datauri = require('datauri');
    if (req.files.logoImage !== undefined) {

        const datauri = new Datauri();
        datauri.format(path.extname(req.files.logoImage[0].originalname).toString(), req.files.logoImage[0].buffer);
        uploader.upload(datauri.content)
            .then((result) => {
                workingCafe.logoURL = result.url;
            })
            .catch(err => res.status(500).json({
                error: 'Could not upload'
            }))
    }
    if (req.files.cafeImage !== undefined) {
        let datauri1 = new Datauri();
        datauri1.format(path.extname(req.files.cafeImage[0].originalname).toString(), req.files.cafeImage[0].buffer);
        uploader.upload(datauri1.content)
            .then((result) => {
                workingCafe.imageURL = result.url;
            })
            .catch(err => res.status(500).json({
                error: 'Could not upload'
            }))
    }
    try {
        let savedCafe = await workingCafe.save();
        req.logIn(savedCafe, {
                session: false
            },
            err => {
                if (err) {
                    console.log(err);
                    res.status(500).json({
                        error: err.message
                    })
                } else {
                    res.status(200).json({
                        status: 'success'
                    });
                }
            })
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

router.post('/register/cafe/', async(req, res) => {
    var token = req.header('x-auth-token')
    if (token) {
        res.status(403).json({
            error: 'You need to be logged out first'
        })
    } else {
        console.log('registering Cafe ', req.body);
        var newAcc = new Cafe({
            name: req.body.name,
            email_id: req.body.email,
            ordersCompleted: [],
            ordersPending: [],
            ordersToBeAccepted: [],
            mobNumber: req.body.number,
            role: 'Cafe',
            description: req.body.description,
            password: bcrypt.hashSync(req.body.password, 10),
        })
        try {
            var newCafe = await newAcc.save();
            req.login(newCafe, {
                session: false
            }, err => {
                if (err) {
                    console.log(err);
                    res.status(500).json({
                        message: 'unable to login the registered Cafe'
                    })
                } else {
                    authService.signToken(req, res);

                }
            })
        } catch (error) {
            res.sendStatus(500)
        }

    }
})
router.post('/register/cafe/withImage', upload.fields([{
    name: 'logoImage',
    maxCount: 1,
}, {
    name: 'cafeImage',
    maxCount: 1,

}]), async(req, res) => {
    var token = req.header('x-auth-token')
    if (token) {
        res.status(403).json({
            error: 'You need to be logged out first'
        })
    } else {
        console.log('registering Cafe ', req.body);
        let logoURL, imageURL;
        if (req.files.logoImage !== undefined) {

            const datauri = new Datauri();
            datauri.format(path.extname(req.files.logoImage[0].originalname).toString(), req.files.logoImage[0].buffer);
            uploader.upload(datauri.content)
                .then((result) => {
                    logoURL = result.url;
                })
                .catch(err => res.status(500).json({
                    error: 'Could not upload'
                }))
        }
        if (req.files.cafeImage !== undefined) {
            let datauri1 = new Datauri();
            datauri1.format(path.extname(req.files.cafeImage[0].originalname).toString(), req.files.cafeImage[0].buffer);
            uploader.upload(datauri1.content)
                .then((result) => {
                    imageURL = result.url;
                })
                .catch(err => res.status(500).json({
                    error: 'Could not upload'
                }))
        }

        var newAcc = new Cafe({
            name: req.body.name,
            email_id: req.body.email,
            ordersCompleted: [],
            ordersPending: [],
            ordersToBeAccepted: [],
            mobNumber: req.body.number,
            role: 'Cafe',
            description: req.body.description,
            password: bcrypt.hashSync(req.body.password, 10),
            logoURL,
            imageURL,
        })

        try {
            var newCafe = await newAcc.save();
            req.login(newCafe, {
                session: false
            }, err => {
                if (err) {
                    console.log(err);
                    res.status(500).json({
                        error: 'unable to login the registered Cafe'
                    })
                } else {
                    authService.signToken(req, res);

                }
            })
        } catch (error) {
            res.sendStatus(500)
        }

    }
})



router.post('/login/cafe', passport.authenticate('local', {
        session: false,
    }), (req, res) => {
        authService.signToken(req, res);
    })
    //checks whether a user(User or Cafe) is logged in or not
    /*router.get('/check', (req, res) => {
            console.log('checking');
            if (req.user) {
                res.status.json({
                    user: req.user
                });
            } else {
                res.sendStatus(404);
            }
        })*/
    //allows User login using google oauth 2 (login only if from iiti domain name)
    // router.get('/login/user',
    //         passport.authenticate("google", {
    //             scope: ["profile", "email"],
    //             failureRedirect: '/login/failure',
    //             accessType: 'offline',
    //             approvalPrompt: 'force'
    //         }), (req, res) => {
    //             console.log('login request');
    //         })
router.post('/login/user', authService.checkOAUTHtoken, passport.authenticate('custom', {
        failureRedirect: '/login/failure',
        session: false,
    }), (req, res) => {
        authService.loginuser(req, res);
    })
    //login api endpoint for Cafe login
    //redirects to working_route/login/failure if not authenticated

router.get('/verify', authService.checkTokenMW, (req, res) => {
    authService.verifyToken(req, res);
    if (null === req.authData) {
        res.sendStatus(403);
    } else {
        res.json(req.authData);
    }
});
//callback for google login.
//do not send direct requests to this endpoint
router.get('/auth/google/callback', passport.authenticate('google', {
        session: false
    }), function(req, res) {
        authService.signToken(req, res);
    })
    //logout route for all user types
    // router.get('/logout', (req, res) => {
    //     console.log('logging out')
    //     req.logout();
    //     res.status(200).json({
    //         message: 'logged out successfully'
    //     })
    // })
module.exports = router;