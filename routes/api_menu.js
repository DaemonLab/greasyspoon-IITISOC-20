var fs = require("fs");
const express = require("express");
const router = express.Router();
const _ = require("lodash");
const Menu = require("../models/Menu");
const Dish = require("../models/Dish");
const {
    ensureAuthenticated,
    ensureCafe
} = require("../config/auth");
const upload = require("../config/multer_support");
const {
    uploader,
    parseImage
} = require('../config/cloudinary_support')
const {
    Cafe
} = require("../models/Cafe");
//working api endpoint /api/menu
//returns list of all cafes
router.get("/", async(req, res) => {
    try {
        let cafeList = await Cafe.find()
            .select({
                orders: 0,
                password: 0,
            })
            .exec();
        res.status(200).json(cafeList);
    } catch (err) {
        res.status(500).json({
            error: err,
            err: err.message,
        });
    }
});
router.get("/all", async(req, res) => {
    console.log("erearea");
    try {
        let menus = await Menu.find({}).exec();
        res.status(200).send(menus);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            err,
        });
    }
});
//working
//returns menu of cafe with cafeid
router.get("/:cafeid", (req, res) => {
    Menu.findOne({
            cafe_id: req.params.cafeid,
        })
        .then((menu) => {
            if (menu) {
                res.json(menu);
            } else {
                res.sendStatus(404);
            }
        })
        .catch((err) => console.log(err.message));
});

router.post("/", ensureCafe, (req, res) => {
    console.log(req.body);
    let deepClone = JSON.parse(JSON.stringify(req.body));

    deepClone.cafe_id = req.user._id;
    deepClone.availability = deepClone.availability == "true";
    deepClone.featured = deepClone.featured == "true";
    console.log(req.user._id);
    Menu.findOneAndUpdate({
            cafe_id: req.user._id,
        }, {
            $push: {
                items: deepClone,
            },
        }, {
            new: true,
            upsert: true,
        },
        (err, workingMenu) => {
            if (err) {
                res.json({
                    error: err.message,
                });
            } else {
                res.status(200).json({
                    status: "Added",
                    newMenu: workingMenu,
                });
            }
        }
    );
});

router.post(
    "/withImage",
    ensureCafe,
    upload.single("dishImage"), parseImage,
    (req, res) => {
        console.log(req.body);
        let deepClone = JSON.parse(JSON.stringify(req.body));
        console.log(req.file);
        if (req.file != undefined) {
            uploader.upload(req.file.encodedUri)
                .then((result) => {
                    deepClone.pictureURL = result.url;
                })
                .catch(err => res.status(500).json({
                    error: 'Could not upload'
                }));

        }
        deepClone.cafe_id = req.user._id;
        deepClone.availability = deepClone.availability == "true";
        deepClone.featured = deepClone.featured == "true";
        console.log(req.user._id);
        Menu.findOneAndUpdate({
                cafe_id: req.user._id,
            }, {
                $push: {
                    items: deepClone,
                },
            }, {
                new: true,
                upsert: true,
            },
            (err, workingMenu) => {
                if (err) {
                    res.json({
                        error: err.message,
                    });
                } else {
                    res.status(200).json({
                        status: "Added",
                        newMenu: workingMenu,
                    });
                }
            }
        );
    }
);
router.patch(
    "/withImage",
    ensureCafe,
    upload.single("dishImage"), parseImage,
    (req, res) => {
        console.log(req.body);
        let deepClone = JSON.parse(JSON.stringify(req.body));
        console.log(req.file);
        if (req.file != undefined) {
            uploader.upload(req.file.encodedUri)
                .then((result) => {
                    deepClone.pictureURL = result.url;
                });
        }
        deepClone.cafe_id = req.user._id;
        if (deepClone.availability !== undefined) {
            deepClone.availability = deepClone.availability == "true";
        }
        if (deepClone.featured !== undefined) {
            deepClone.featured = deepClone.featured == "true";
        }
        console.log(req.user._id);
        const dish_id = deepClone.dish_id;
        deepClone._id = dish_id;
        delete deepClone.dish_id;
        Menu.findOneAndUpdate({
                cafe_id: req.user._id,
                "items._id": dish_id,
            }, {
                $set: {
                    "items.$": deepClone,
                },
            }, {
                new: true,
            },
            (err, workingMenu) => {
                if (err) {
                    res.json({
                        error: err.message,
                    });
                } else {
                    res.status(200).json({
                        status: "Patched",
                        newMenu: workingMenu,
                    });
                }
            }
        );
    }
);
router.put(
    "/:dish_id/onlyImage/",
    ensureCafe,
    upload.single("dishImage"), parseImage, async(req, res) => {
        try {
            let workingMenu = await Menu.findOne({
                cafe_id: req.user._id,
            }).exec();
            if (!workingMenu) {
                res.status(404).json({
                    error: "Could not find the menu",
                });
            }

            let workingDish = await workingMenu.items.id(req.params.dish_id);
            if (!workingDish) {
                res.status(404).json({
                    error: "Could not find the dish",
                });
            }
            if (req.file != undefined) {
                uploader.upload(req.file.encodedUri)
                    .then((result) => {
                        workingDish.pictureURL = result.url;
                    });
            }
            let newMenu = await workingMenu.save();
            res.status(200).json({
                success: "Updated the dish",
                menu: newMenu,
            });
        } catch (error) {
            console.log(error);
            return new Error(error);
        }
    }
);

router.delete("/:dishID", ensureCafe, async(req, res) => {
    try {
        let workingMenu = await Menu.findOne({
            cafe_id: req.user._id,
        }).exec();
        workingDish = await workingMenu.items.id(req.params.dishID);
        if (workingDish.pictureURL) {
            let imgURL = workingDish.pictureURL;
            await fs.unlinkSync(imgURL);
            console.log("image deleted");
        }
        let newItems = workingMenu.items.filter((dish) => {
            return dish._id.toString() !== req.params.dishID;
        });
        workingMenu.items = newItems;
        let newMenu = await workingMenu.save();
        res.status(200).json({
            status: "deleted",
            newMenu,
        });
    } catch (e) {
        return new Error(e);
    }
});

module.exports = router;