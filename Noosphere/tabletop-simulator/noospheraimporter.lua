--[[
  Noosphera — IMPORTADOR sem XmlUI (evita crash do Tabletop Simulator com UI + Global.setTable gigante).

  1) Cole o texto completo de squad_noosphera.json na DESCRIÇÃO deste objeto
     (botão direito no token → ícone de lápis / janela do objeto → campo Description / Notas),
     OU coloque só uma URL https://... para um ficheiro JSON público (Cloudflare, gist raw, etc.).
  2) Botão direito no token → "Noosphera: carregar da DESCRIÇÃO (JSON ou URL)".
  3) Ferramenta Select → escolhe miniatura → botão direito no token → "Noosphera: LIGAR próxima…".

  O esquadrão fica só em memória neste script (cached_squad). Não usa Global.setTable para o JSON inteiro.
]]

local cached_squad = nil

local function safeStr(x)
    if x == nil then return "" end
    return tostring(x)
end

local function trim(s)
    if s == nil then return "" end
    return (tostring(s):gsub("^%s+", ""):gsub("%s+$", ""))
end

local function countUnits(units)
    if type(units) ~= "table" then return 0 end
    local n = 0
    for _ in ipairs(units) do n = n + 1 end
    return n
end

local function bindShallowReset()
    Global.setTable("NOOSPHERA_BIND", { idx = 1 })
end

local function parseAndStore(raw, player_color)
    local ok, data = pcall(function() return JSON.decode(raw) end)
    if not ok or type(data) ~= "table" or data.units == nil then
        broadcastToColor("JSON invalido (precisa de objeto com units[]).", player_color, Color.Red)
        return false
    end
    cached_squad = data
    bindShallowReset()
    local n = countUnits(data.units)
    broadcastToColor("Carregado: " .. n .. " unidade(s). Indice de ligacao = 1.", player_color, Color.Green)
    return true
end

--- Menu: ler JSON do campo Description deste objeto, ou URL https no mesmo campo
function loadFromDescription(player_color)
    local raw = trim(self.getDescription())
    if raw == "" then
        broadcastToColor("Cole o JSON ou uma URL https na DESCRICAO deste token.", player_color, Color.Red)
        return
    end
    if raw:find("^https?://") then
        broadcastToColor("A pedir JSON pela URL…", player_color, Color.Grey)
        WebRequest.get(raw, function(res)
            if res.is_error then
                broadcastToColor("URL falhou.", player_color, Color.Red)
                return
            end
            parseAndStore(res.text or "", player_color)
        end)
        return
    end
    parseAndStore(raw, player_color)
end

local function buildEnrichedUnit(unitRow)
    local u = {}
    if type(unitRow) ~= "table" then return u end
    for k, v in pairs(unitRow) do
        u[k] = v
    end
    if cached_squad ~= nil then
        u._globals = {
            squad_name = cached_squad.squad_name,
            global_faccao = cached_squad.global_faccao,
            global_tatica = cached_squad.global_tatica,
            tatica_info = cached_squad.tatica_info,
            faccao_passiva = cached_squad.faccao_passiva,
            total_pts = cached_squad.total_pts,
        }
    end
    return u
end

--- Menu: ligar cached_squad.units[idx] à primeira peça selecionada
function bindNextToSelection(player_color)
    if cached_squad == nil or cached_squad.units == nil then
        broadcastToColor("Carregue o JSON primeiro (menu na DESCRICAO).", player_color, Color.Red)
        return
    end
    local units = cached_squad.units
    local max = countUnits(units)
    if max < 1 then
        broadcastToColor("units[] vazio.", player_color, Color.Red)
        return
    end
    local pdata = Player[player_color]
    local sel = pdata.getSelectedObjects()
    if sel == nil or #sel < 1 then
        broadcastToColor("Selecione uma miniatura (ferramenta Select).", player_color, Color.Red)
        return
    end
    local state = Global.getTable("NOOSPHERA_BIND") or { idx = 1 }
    local idx = tonumber(state.idx) or 1
    if idx > max then
        broadcastToColor("Indice passou do fim. Reset pelo menu.", player_color, Color.Orange)
        return
    end
    local u = units[idx]
    local enriched = buildEnrichedUnit(u)
    local payload = JSON.encode(enriched)
    local obj = sel[1]
    local okCall, errCall = pcall(function()
        obj.call("noosApplyUnit", payload)
    end)
    if not okCall then
        broadcastToColor("Falhou: miniatura precisa do script NoospheraUnit.lua. " .. safeStr(errCall), player_color, Color.Red)
        return
    end
    state.idx = idx + 1
    Global.setTable("NOOSPHERA_BIND", state)
    broadcastToColor(
        "Ligado: " .. safeStr(u.name) .. " (" .. safeStr(idx) .. "/" .. safeStr(max) .. ")",
        player_color,
        Color.Green
    )
end

function resetBindIdx(player_color)
    bindShallowReset()
    broadcastToColor("Indice de ligacao = 1.", player_color, Color.Grey)
end

function onLoad()
    cached_squad = nil
    bindShallowReset()
    self.addContextMenuItem("Noosphera: carregar da DESCRICAO (JSON ou URL)", loadFromDescription)
    self.addContextMenuItem("Noosphera: LIGAR proxima unidade a SELECAO", bindNextToSelection)
    self.addContextMenuItem("Noosphera: resetar indice de ligacao", resetBindIdx)
end
