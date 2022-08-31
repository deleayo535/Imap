const catchAsync = require("../util/catchAsync");
const AppError = require("../util/appError");

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    const query = Model.find({ ...req.query });
    const doc = await query;

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
    next;
  });
