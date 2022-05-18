const { driver } = require('../db.js')

const get_id_of_user = (user) => {
    return user._id
        ?? user.properties._id
        ?? user.identity.low
        ?? user.identity
}

exports.get_id_of_user = get_id_of_user

exports.get_current_user_id = (res) => {
    const user = res.locals.user
    return get_id_of_user(user)
}

const user_id_filter = ` WHERE user._id = $user_id `
exports.user_id_filter = user_id_filter

const user_query = ` MATCH (user:User) ${user_id_filter}`
exports.user_query = user_query

exports.register_last_login = async (user) => {

    const session = driver.session()

    try {
        const user_id = get_id_of_user(user)
        const query = `
            ${user_query}
            SET user.last_login = date()
            RETURN user.last_login as last_login
            `

        await session.run(query, { user_id })
    
    }
    catch (error) {
        throw error
    }
    finally {
        session.close()
    }

}