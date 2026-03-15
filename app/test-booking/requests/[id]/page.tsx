<div className="space-y-2 text-slate-700">
  <h3 className="text-xl font-semibold text-[#003768]">
    {bid.partner_company_name || "Car Hire Company"}
  </h3>

  <p>
    <span className="font-semibold text-slate-900">Company:</span>{" "}
    {bid.partner_company_name || "—"}
  </p>

  <p>
    <span className="font-semibold text-slate-900">Phone:</span>{" "}
    {bid.partner_phone || "—"}
  </p>

  <p>
    <span className="font-semibold text-slate-900">Vehicle:</span>{" "}
    {bid.vehicle_category_name}
  </p>

  <p>
    <span className="font-semibold text-slate-900">Car hire:</span>{" "}
    {bid.car_hire_price}
  </p>

  <p>
    <span className="font-semibold text-slate-900">Fuel:</span>{" "}
    {bid.fuel_price}
  </p>

  <p>
    <span className="font-semibold text-slate-900">Total:</span>{" "}
    {bid.total_price}
  </p>

  <p>
    <span className="font-semibold text-slate-900">Insurance included:</span>{" "}
    {bid.full_insurance_included ? "Yes" : "No"}
  </p>

  <p>
    <span className="font-semibold text-slate-900">Full tank included:</span>{" "}
    {bid.full_tank_included ? "Yes" : "No"}
  </p>

  <p>
    <span className="font-semibold text-slate-900">Notes:</span>{" "}
    {bid.notes || "—"}
  </p>

  <p>
    <span className="font-semibold text-slate-900">Status:</span>{" "}
    <span className="capitalize">{bid.status}</span>
  </p>
</div>