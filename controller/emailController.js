const factory = require("./handlerFactory");
const Email = require("./../model/emailModel");

exports.getAllEmails = factory.getAll(Email);
// exports.getEmail = factory.getOne(Email);
// exports.createRoom = factory.createOne(Email);
// exports.updateRoom = factory.updateOne(Email);
// exports.deleteRoom = factory.deleteOne(Email);

// const router = express.Router();
