--[[
  Noosphera — Script do OBJETO (cada miniatura com ficha)
  Copie para: objeto → ícone ⚙ → Scripting → Lua

  Depois cole NoospheraUnit.xml na aba UI do mesmo objeto.
  Exija script salvo + tag "noosphera_unit" (adicionada automaticamente no onLoad).
]]

local NOOS_TAG = "noosphera_unit"

-- XmlUI + Text muito longo costuma crashar o motor do TTS (Yellowscribe evita isso metendo BBCode na Description).
local UI_MAX_MINI = 1200
local UI_MAX_FAC = 2400
local UI_MAX_BODY = 9000

local function safeStr(x)
    if x == nil then return "" end
    return tostring(x)
end

local function joinStrings(v)
    if v == nil then return "" end
    if type(v) == "string" then return v end
    if type(v) ~= "table" then return safeStr(v) end
    local out = {}
    for _, x in pairs(v) do
        table.insert(out, safeStr(x))
    end
    table.sort(out)
    return table.concat(out, ", ")
end

local function statLine(se)
    if type(se) ~= "table" then return "" end
    return string.format(
        "VIDA %s · MOV %s · DEC %s · AP %s · Me %s · Ra %s · Sp %s",
        safeStr(se.vida), safeStr(se.movimento), safeStr(se.decoerencia), safeStr(se.ap),
        safeStr(se.armadura_melee), safeStr(se.armadura_ranged), safeStr(se.armadura_special)
    )
end

local function formatUnitBody(u)
    if type(u) ~= "table" then return "(sem dados)" end
    local lines = {}
    local se = u.stats_effective or u.stats or {}
    table.insert(lines, "Arma / utility: " .. safeStr((u.weapon and u.weapon ~= "") and u.weapon or "—"))
    table.insert(lines, "Stats (efetivos): " .. statLine(se))
    if u.loadout_max_effective ~= nil then
        table.insert(lines, "Loadout máx (efetivo): " .. safeStr(u.loadout_max_effective))
    end
    table.insert(lines, "")
    table.insert(lines, "Keywords: " .. joinStrings(u.keywords))
    table.insert(lines, "Características (modelo): " .. joinStrings(u.caracteristicas))
    local tg = u.tactic_granted
    if type(tg) == "table" then
        if #(tg.passivas or {}) > 0 then
            table.insert(lines, "Passivas (tática/upgrades): " .. table.concat(tg.passivas, ", "))
        end
        if #(tg.ativas or {}) > 0 then
            table.insert(lines, "Ativas (tática/upgrades): " .. table.concat(tg.ativas, ", "))
        end
        if #(tg.caracteristicas or {}) > 0 then
            table.insert(lines, "Características extras: " .. table.concat(tg.caracteristicas, ", "))
        end
    end
    table.insert(lines, "")
    local ups = u.upgrades
    if type(ups) == "table" and #ups > 0 then
        table.insert(lines, "Upgrades de tática:")
        for _, up in ipairs(ups) do
            if type(up) == "table" then
                table.insert(lines, string.format(" • %s (+%s pts) — %s",
                    safeStr(up.nome), safeStr(up.pontos), safeStr(up.descricao)))
            end
        end
        table.insert(lines, "")
    end
    table.insert(lines, "Habilidades ativas: " .. joinStrings(u.habilidades_ativas))
    table.insert(lines, "Habilidades passivas: " .. joinStrings(u.habilidades_passivas))
    return table.concat(lines, "\n")
end

local function clampForUi(s, maxLen)
    s = safeStr(s)
    if #s <= maxLen then return s end
    return s:sub(1, maxLen - 24) .. "\n… (truncado)"
end

local function formatGlobalsBlurb()
    local ustored = self.getTable("noos_unit")
    local g = nil
    if type(ustored) == "table" and type(ustored._globals) == "table" then
        g = ustored._globals
    end
    if type(g) ~= "table" then
        g = Global.getTable("NOOSPHERA_EXPORT")
    end
    if type(g) ~= "table" then return "" end
    local bits = {}
    if safeStr(g.global_faccao) ~= "" then table.insert(bits, "Facção lista: " .. safeStr(g.global_faccao)) end
    if safeStr(g.global_tatica) ~= "" then table.insert(bits, "Tática: " .. safeStr(g.global_tatica)) end
    local ti = g.tatica_info
    if type(ti) == "table" and safeStr(ti.descricao) ~= "" then
        table.insert(bits, ti.descricao)
    end
    local fp = g.faccao_passiva
    if type(fp) == "table" then
        table.insert(bits, "Passiva facção: " .. safeStr(fp.nome) .. " — " .. safeStr(fp.descricao))
    end
    return table.concat(bits, "\n\n")
end

function redrawAll()
    local u = self.getTable("noos_unit")
    if type(u) ~= "table" then u = {} end
    local se = u.stats_effective or u.stats or {}
    local loadExtra = ""
    if u.loadout_max_effective ~= nil then
        loadExtra = "\nLoadout máx " .. safeStr(u.loadout_max_effective)
    end
    local mini = string.format(
        "%s\nPts total %s · Noosphere %s\n%s%s\nArma: %s",
        safeStr(u.name), safeStr(u.pontos_total), safeStr(u.noosphera),
        statLine(se),
        loadExtra,
        safeStr((u.weapon and u.weapon ~= "") and u.weapon or "—")
    )
    mini = clampForUi(mini, UI_MAX_MINI)
    local bodyRaw = formatUnitBody(u)
    pcall(function()
        self.UI.setValue("miniText", mini)
        self.UI.setValue("fullTitle", clampForUi(safeStr(u.name), 200))
        self.UI.setValue("fullPts", clampForUi(string.format(
            "%s pts · %s · %s",
            safeStr(u.pontos_total), safeStr(u.faccao), safeStr(u.tatica)
        ), 400))
        self.UI.setValue("fullFac", clampForUi(formatGlobalsBlurb(), UI_MAX_FAC))
        self.UI.setValue("fullBody", clampForUi(bodyRaw, UI_MAX_BODY))
    end)
end

function wireButtons()
    local ok, err = pcall(function()
        local g = self.getGUID()
        self.UI.setAttribute("btnFull", "onClick", g .. "/toggleFullCard")
        self.UI.setAttribute("btnCollapse", "onClick", g .. "/collapseFullCard")
    end)
    if not ok then
        print("[NoospheraUnit] wireButtons: " .. tostring(err))
    end
end

function onLoad(save)
    self.addTag(NOOS_TAG)
    local u = {}
    if save ~= nil and save ~= "" then
        local ok, dec = pcall(function() return JSON.decode(save) end)
        if ok and type(dec) == "table" then u = dec end
    end
    self.setTable("noos_unit", u)
    Wait.frames(function()
        wireButtons()
        redrawAll()
    end, 30)
end

function onSave()
    local u = self.getTable("noos_unit")
    if u ~= nil and type(u) == "table" and next(u) ~= nil then
        return JSON.encode(u)
    end
    return ""
end

function noosShowMini()
    self.UI.setAttribute("miniWrap", "active", true)
end

function noosHideMini()
    self.UI.setAttribute("miniWrap", "active", false)
end

function toggleFullCard(_pc)
    local cur = self.UI.getAttribute("fullWrap", "active")
    local on = (cur == true or cur == "true")
    self.UI.setAttribute("fullWrap", "active", not on)
end

function collapseFullCard(_pc)
    self.UI.setAttribute("fullWrap", "active", false)
end

--[[ Chamado pelo Importador: payload = JSON da entrada units[i] ]]
function noosApplyUnit(payload)
    if payload == nil or payload == "" then return end
    local ok, u = pcall(function() return JSON.decode(payload) end)
    if not ok or type(u) ~= "table" then return end
    self.setTable("noos_unit", u)
    local disp = safeStr(u.name)
    if disp ~= "" then pcall(function() self.setName(disp) end) end
    redrawAll()
end
