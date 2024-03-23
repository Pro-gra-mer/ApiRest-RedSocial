const Follow = require("../models/follow");

const followUserIds = async (identityUserId) => {
  try {
    // Buscar los IDs de los usuarios que está siguiendo el usuario identificado
    const following = await Follow.distinct("followed", {
      user: identityUserId,
    });

    // Buscar los IDs de los usuarios que siguen al usuario identificado
    const followers = await Follow.distinct("user", {
      followed: identityUserId,
    });

    return {
      following,
      followers,
    };
  } catch (error) {
    console.error("Error en followUserIds:", error);
    return {};
  }
};

const followThisUser = async (identityUserId, profileUserId) => {
  // Sacar info seguimiento
  let following = await Follow.findOne({
    user: identityUserId,
    followed: profileUserId,
  });

  let follower = await Follow.findOne({
    user: profileUserId,
    followed: identityUserId,
  });

  return {
    following,
    follower,
  };
};

module.exports = {
  followUserIds,
  followThisUser,
};
