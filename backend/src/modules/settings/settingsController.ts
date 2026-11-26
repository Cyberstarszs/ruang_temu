import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';

// 1. GET STORE SETTINGS
export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let result = await pool.query(`SELECT * FROM store_settings LIMIT 1`);
    
    // Auto-create default settings if table is empty
    if (result.rows.length === 0) {
      result = await pool.query(`
        INSERT INTO store_settings (store_name, tagline, address, phone, receipt_footer, rounding_rule)
        VALUES ('RUANG TEMU', 'Coffee, Eatery, Community', 'Jl. Raya Pamekasan No. 24, Madura', '081234567890', 'Terima kasih telah berkunjung ke Ruang Temu! Follow IG: @ruangtemu.cafe', 100)
        RETURNING *
      `);
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// 2. UPDATE STORE SETTINGS (Owner/Manager only)
export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      store_name,
      tagline,
      address,
      phone,
      receipt_footer,
      rounding_rule,
      paper_size,
      tax_rate,
      service_charge_rate,
      auto_print_receipt,
      auto_print_bar,
      auto_print_kitchen,
      cashier_printer_name,
      bar_printer_name,
      kitchen_printer_name,
      wifi_ssid,
      wifi_password,
      instagram,
    } = req.body;
    const userId = req.user?.id;

    // Check if exists
    let existing = await pool.query(`SELECT id FROM store_settings LIMIT 1`);
    let result;

    if (existing.rows.length === 0) {
      result = await pool.query(`
        INSERT INTO store_settings (
          store_name, tagline, address, phone, receipt_footer, rounding_rule,
          paper_size, tax_rate, service_charge_rate,
          auto_print_receipt, auto_print_bar, auto_print_kitchen,
          cashier_printer_name, bar_printer_name, kitchen_printer_name,
          wifi_ssid, wifi_password, instagram, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        store_name || 'RUANG TEMU',
        tagline || '',
        address || '',
        phone || '',
        receipt_footer || '',
        Number(rounding_rule) || 100,
        paper_size || '58mm',
        tax_rate !== undefined ? Number(tax_rate) : 0,
        service_charge_rate !== undefined ? Number(service_charge_rate) : 0,
        auto_print_receipt !== undefined ? Boolean(auto_print_receipt) : true,
        auto_print_bar !== undefined ? Boolean(auto_print_bar) : true,
        auto_print_kitchen !== undefined ? Boolean(auto_print_kitchen) : true,
        cashier_printer_name || 'Printer Kasir',
        bar_printer_name || 'Printer Bar Checker',
        kitchen_printer_name || 'Printer Dapur Checker',
        wifi_ssid || 'Ruang Temu Cafe',
        wifi_password || '',
        instagram || '@ruangtemu.cafe',
      ]);
    } else {
      result = await pool.query(`
        UPDATE store_settings
        SET store_name = COALESCE($1, store_name),
            tagline = COALESCE($2, tagline),
            address = COALESCE($3, address),
            phone = COALESCE($4, phone),
            receipt_footer = COALESCE($5, receipt_footer),
            rounding_rule = COALESCE($6, rounding_rule),
            paper_size = COALESCE($7, paper_size),
            tax_rate = COALESCE($8, tax_rate),
            service_charge_rate = COALESCE($9, service_charge_rate),
            auto_print_receipt = COALESCE($10, auto_print_receipt),
            auto_print_bar = COALESCE($11, auto_print_bar),
            auto_print_kitchen = COALESCE($12, auto_print_kitchen),
            cashier_printer_name = COALESCE($13, cashier_printer_name),
            bar_printer_name = COALESCE($14, bar_printer_name),
            kitchen_printer_name = COALESCE($15, kitchen_printer_name),
            wifi_ssid = COALESCE($16, wifi_ssid),
            wifi_password = COALESCE($17, wifi_password),
            instagram = COALESCE($18, instagram),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $19
        RETURNING *
      `, [
        store_name,
        tagline,
        address,
        phone,
        receipt_footer,
        rounding_rule !== undefined ? Number(rounding_rule) : undefined,
        paper_size,
        tax_rate !== undefined ? Number(tax_rate) : undefined,
        service_charge_rate !== undefined ? Number(service_charge_rate) : undefined,
        auto_print_receipt !== undefined ? Boolean(auto_print_receipt) : undefined,
        auto_print_bar !== undefined ? Boolean(auto_print_bar) : undefined,
        auto_print_kitchen !== undefined ? Boolean(auto_print_kitchen) : undefined,
        cashier_printer_name,
        bar_printer_name,
        kitchen_printer_name,
        wifi_ssid,
        wifi_password,
        instagram,
        existing.rows[0].id,
      ]);
    }

    // Log audit
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
      VALUES ($1, 'UPDATE_SETTINGS', 'store_settings', $2, $3)
    `, [userId, result.rows[0].id, JSON.stringify(req.body)]);

    res.json({
      success: true,
      message: 'Pengaturan toko berhasil diperbarui.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}
