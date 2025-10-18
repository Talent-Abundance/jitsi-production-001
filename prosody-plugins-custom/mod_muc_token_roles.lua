local log = module._log;
local jid = require "util.jid";
local json = require "util.json";

module:hook("muc-occupant-pre-join", function(event)
    local session = event.origin;
    local token = session.auth_token;

    if not token then
        log("warn", "❌ No JWT token found — denying moderator rights.");
        session.jitsi_moderator = false;
        return;
    end

    local claims = session.jwt_claims or {};
    local context = claims.context or {};
    local user = context.user or {};
    local is_moderator = user.moderator;

    if is_moderator then
        log("warn", "✅ moderator=true — granting moderator role.");
        session.jitsi_moderator = true;
    else
        log("warn", "❌ moderator=false — not granting moderator role.");
        session.jitsi_moderator = false;
    end
end, 10);

log("warn", "✅ mod_muc_token_roles.lua is loaded and running!");
