--[[
  Noosphera — Script GLOBAL da mesa (Tabletop Simulator)
  Menu: Games → Scripting → Global

  Coloque este arquivo inteiro no editor Global. Ele coordena hover da mini-ficha
  entre miniaturas com tag "noosphera_unit".
]]

local NOOS_TAG = "noosphera_unit"
local lastHoverGuid = nil

function onObjectHover(player_color, hovered)
    if lastHoverGuid ~= nil then
        local prev = getObjectFromGUID(lastHoverGuid)
        if prev ~= nil then
            pcall(function() prev.call("noosHideMini") end)
        end
        lastHoverGuid = nil
    end
    if hovered ~= nil and hovered.hasTag(NOOS_TAG) then
        hovered.call("noosShowMini")
        lastHoverGuid = hovered.getGUID()
    end
end
