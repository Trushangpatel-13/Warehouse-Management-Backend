const Router = require('express').Router();
const ProductDetail = require('../models/Products');
const admin = require('firebase-admin');

var serviceAccount = require('../admin.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://smart-warehouse-1406f-default-rtdb.firebaseio.com",
    authDomain: "smart-warehouse-1406f.firebaseapp.com",
});
// to add the product every time product pass through the RFID technology
var db = admin.database();

Router.route('/add_product')


    .post((req, res) => {
        path = "RFID/" + req.body.uid;
        db.ref(path).once('value', (uid) => {
            console.log(uid.val());
            algorithm(uid.val(), res);
            //return res.status(200).json({data:res_data});


        })
        // we have three different type of the type of products
        // 1. food
        // 2. cloth
        // 3. other
        // food last two rows (5th and 6th)
        // cloth (3rd and 4th)
        // other (1st and 2nd)

        // 1 unit - 20cm
    })

function algorithm(data, res) {
    let scale_quant = 8;
    //return data.item_type;
    db.ref("Packages").once('value', (products) => {
        if (products.val() == null) {
            let final_x_cord = -1;
            let final_y_cord = -1;
            if (data.item_type === "Food") {
                final_x_cord = 2;
                final_y_cord = 0;
            } else if (data.item_type === "Cloth") {
                final_x_cord = 1;
                final_y_cord = 0;
            } else {
                final_x_cord = 0;
                final_y_cord = 0;
            }
            let item = {
                serial_number: data.serial_number,
                manufacturer: data.manufacturer,
                date_of_entry: new Date(),
                date_of_expiry: data.date_of_expiry,
                item_type: data.item_type,
                x_cord: (final_x_cord),
                y_cord: (final_y_cord)
            }
            db.ref("Packages").child("0").set(item);
            return res.status(200).json({ item });
        }
        let n = Object.keys(products.val()).length;


        // number of products in the board

        // initially all the entries in the board is empty
        // 0 - not visited
        // 1  - visited

        let board = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ];

        for (let i = 0; i < n; i++) {
            let x = (products.val()[i].x_cord);
            let y = (products.val()[i].y_cord);
            // marking the position of the product in the board
            board[x][y] = 1;
        }

        let itemType = data.item_type;
        let final_x_cord = -1;
        let final_y_cord = -1;

        if (itemType === "Food") {
            // for food
            for (let i = 2; i >= 0; i--) {
                for (let j = 0; j <= 2; j++) {
                    if (board[i][j] === 0) {
                        final_x_cord = i;
                        final_y_cord = j;
                        break;
                    }
                }
                if (final_x_cord !== -1 && final_y_cord !== -1) {
                    break;
                }
            }
        } else if (itemType === "Cloth") {
            // for cloth
            final_x_cord = -1;
            final_y_cord = -1;
            for (let i = 1; i >= 0; i--) {
                for (let j = 0; j <= 2; j++) {
                    if (board[i][j] === 0) {
                        final_x_cord = i;
                        final_y_cord = j;
                        break;
                    }
                }
                if (final_x_cord !== -1 && final_y_cord !== -1) {
                    break;
                }
            }
        } else {
            // for other
            final_x_cord = -1;
            final_y_cord = -1;
            for (let i = 0; i >= 0; i--) {
                for (let j = 0; j <= 2; j++) {
                    if (board[i][j] === 0) {
                        final_x_cord = i;
                        final_y_cord = j;
                        break;
                    }
                }
                if (final_x_cord !== -1 && final_y_cord !== -1) break;
            }
        }

        if (final_x_cord === -1 && final_y_cord === -1) {
            return res.status(200).json({ status: "error no slots available" });
        }

        let item = {
            serial_number: data.serial_number,
            manufacturer: data.manufacturer,
            date_of_entry: new Date(),
            date_of_expiry: data.date_of_expiry,
            item_type: data.item_type,
            x_cord: (final_x_cord),
            y_cord: (final_y_cord)
        };


        let count = n.toString();
        //console.log(typeof (count));
        //console.log(count);

        //db.ref("Packages").push(item);
        db.ref("Packages").child(count).set(item);

        return res.status(200).json({ status: "success", data: item });
    })

}


// On the all information product page I need to get all the information one by one
Router.route('/get_info')
    .get((req, res) => {
        db.ref("Packages").once('value', function (snap) {
            return res.status(200).json(snap.val());
        })

    })


// track the particular product taken by the admin and enter in the search bar of tracker id

Router.route('/get_info_of_product/:product_id')
    .get((req, res) => {
        db.ref("Packages").once('value', function (snap) {
            for (let i = 0; i < snap.val().length; i++) {
                if (snap.val()[i].serial_number === req.params.product_id) {
                    return res.status(200).json(snap.val()[i]);
                }
            }
            return res.status(200).json({ status: "error", error: "No product found!!!" });
        })
    })


// To update the product detail in the cards representation of the product we can have the functionality to update
// the product date of expiry
Router.route('/update_product/:product_id')
    .post((req, res) => {
        ProductDetail.findOne({ serial_number: req.params.product_id })
            .then((product) => {
                console.log(1);
                product.date_of_entry = new Date();
                product.date_of_expiry = req.body.date_of_expiry;
                //product.item_type = req.body.item_type;
                product.save();
                return res.json(product);
            })
            .catch((err) => {
                return res.json({ status: "error", error: "Not able to retrieve the product" });
            })
    })

// now we need to able to delete after the expiratiton of date automatically


exports = module.exports = Router;