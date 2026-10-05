from app.config import get_settings


def get_channel():
    """Return the outbound WhatsApp channel selected by ACTIVE_CHANNEL.

    "evolution" -> Evolution API (Baileys, no Meta account needed)
    "meta"      -> WhatsApp Business Cloud API

    Both expose ``await send_message(instance_or_phone_number_id, to, body)``,
    so moving from Evolution to Meta later is a config change only.
    """
    if get_settings().active_channel == "evolution":
        from app.channels.evolution.handler import EvolutionHandler
        return EvolutionHandler()
    from app.channels.whatsapp.handler import WhatsAppHandler
    return WhatsAppHandler()
