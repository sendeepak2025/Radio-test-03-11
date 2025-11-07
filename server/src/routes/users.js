const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/authMiddleware');
const AuthenticationService = require('../services/authentication-service');
const rbacController = require('../controllers/rbacController');
const bcrypt = require('bcryptjs')

// Initialize services
const authService = new AuthenticationService();
const rbacService = rbacController.getRBACService();

/**
 * GET /api/users
 * Get all users (admin/user manager only)
 * Hospital admins see only their hospital's users
 * Super admins see all users
 */
router.get('/', 
  authService.authenticationMiddleware(),
  async (req, res) => {
    try {
      const { role, status, search } = req.query;
      
      // Build query
      let query = {};
      
      // Multi-tenancy: Filter by hospital
      const isSuperAdmin = req.user.roles?.includes('system:admin') || 
                           req.user.roles?.includes('super_admin');
      
      // If not super admin, only show users from the same hospital
      if (!isSuperAdmin && req.user.hospitalId) {
        query.hospitalId = req.user.hospitalId;
      }
      
      if (role) {
        query.roles = role;
      }
      
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      }
      
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }
      
      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();
      
      // Add last login info
      const usersWithActivity = users.map(user => ({
        ...user,
        lastLogin: user.lastLogin || null
      }));
      
      res.json({ 
        success: true, 
        data: usersWithActivity,
        total: usersWithActivity.length
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch users',
        error: error.message 
      });
    }
  }
);

/**
 * GET /api/users/:id
 * Get user by ID
 * Hospital admins can only view users from their hospital
 */
router.get('/:id',
  authService.authenticationMiddleware(),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id)
        .select('-password')
        .lean();
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Multi-tenancy check: Hospital admins can only view their hospital's users
      const isSuperAdmin = req.user.roles?.includes('system:admin') || 
                           req.user.roles?.includes('super_admin');
      
      if (!isSuperAdmin && req.user.hospitalId && user.hospitalId !== req.user.hospitalId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: You can only view users from your hospital' 
        });
      }
      
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch user',
        error: error.message 
      });
    }
  }
);

/**
 * POST /api/users
 * Create new user
 * Hospital admins automatically assign their hospitalId to new users
 */
router.post('/',
  authService.authenticationMiddleware(),
  async (req, res) => {
    try {
      const { username, email, password, firstName, lastName, roles, isActive, hospitalId } = req.body;
      
      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username, email, and password are required' 
        });
      }
      
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [{ username }, { email }] 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this username or email already exists' 
        });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Multi-tenancy: Determine hospitalId
      const isSuperAdmin = req.user.roles?.includes('system:admin') || 
                           req.user.roles?.includes('super_admin');
      
      let assignedHospitalId;
      if (isSuperAdmin) {
        // Super admin can specify hospitalId or leave it null
        assignedHospitalId = hospitalId || null;
      } else {
        // Hospital admin: automatically use their hospitalId
        assignedHospitalId = req.user.hospitalId;
      }
      
      // Create user
      const user = new User({
        username,
        email,
        password: passwordHash,
        passwordHash,
        firstName: firstName || '',
        lastName: lastName || '',
        roles: roles || ['staff'],
        isActive: isActive !== undefined ? isActive : true,
        hospitalId: assignedHospitalId
      });
      
      await user.save();
      
      // Return user without password
      const userResponse = user.toObject();
      delete userResponse.password;
      
      console.log('✅ User created:', { 
        id: user._id, 
        username: user.username, 
        hospitalId: user.hospitalId 
      });
      
      res.status(201).json({ 
        success: true, 
        data: userResponse,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(400).json({ 
        success: false, 
        message: 'Failed to create user',
        error: error.message 
      });
    }
  }
);

/**
 * PUT /api/users/:id
 * Update user
 * Hospital admins can only update users from their hospital
 */
router.put('/:id',
  authService.authenticationMiddleware(),
  async (req, res) => {
    try {
      const { firstName, lastName, email, roles, isActive, hospitalId } = req.body;
      
      // Check if user exists and verify hospital access
      const existingUser = await User.findById(req.params.id);
      if (!existingUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Multi-tenancy check
      const isSuperAdmin = req.user.roles?.includes('system:admin') || 
                           req.user.roles?.includes('super_admin');
      
      if (!isSuperAdmin && req.user.hospitalId && existingUser.hospitalId !== req.user.hospitalId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: You can only update users from your hospital' 
        });
      }
      
      // Build update object
      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (roles !== undefined) updateData.roles = roles;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      // Only super admin can change hospitalId
      if (isSuperAdmin && hospitalId !== undefined) {
        updateData.hospitalId = hospitalId;
      }
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');
      
      console.log('✅ User updated:', { id: user._id, username: user.username });
      
      res.json({ 
        success: true, 
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(400).json({ 
        success: false, 
        message: 'Failed to update user',
        error: error.message 
      });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete user (soft delete - set isActive to false)
 * Hospital admins can only delete users from their hospital
 */
router.delete('/:id',
  authService.authenticationMiddleware(),
  async (req, res) => {
    try {
      // Prevent self-deletion
      if (req.user && req.user.id === req.params.id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot delete your own account' 
        });
      }
      
      // Check if user exists and verify hospital access
      const existingUser = await User.findById(req.params.id);
      if (!existingUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Multi-tenancy check
      const isSuperAdmin = req.user.roles?.includes('system:admin') || 
                           req.user.roles?.includes('super_admin');
      
      if (!isSuperAdmin && req.user.hospitalId && existingUser.hospitalId !== req.user.hospitalId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: You can only delete users from your hospital' 
        });
      }
      
      // Soft delete - just deactivate
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      ).select('-password');
      
      console.log('✅ User deactivated:', { id: user._id, username: user.username });
      
      res.json({ 
        success: true, 
        message: 'User deactivated successfully',
        data: user
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete user',
        error: error.message 
      });
    }
  }
);

/**
 * POST /api/users/:id/activate
 * Reactivate a deactivated user
 * Hospital admins can only activate users from their hospital
 */
router.post('/:id/activate',
  authService.authenticationMiddleware(),
  async (req, res) => {
    try {
      // Check if user exists and verify hospital access
      const existingUser = await User.findById(req.params.id);
      if (!existingUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Multi-tenancy check
      const isSuperAdmin = req.user.roles?.includes('system:admin') || 
                           req.user.roles?.includes('super_admin');
      
      if (!isSuperAdmin && req.user.hospitalId && existingUser.hospitalId !== req.user.hospitalId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: You can only activate users from your hospital' 
        });
      }
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: true },
        { new: true }
      ).select('-password');
      
      console.log('✅ User activated:', { id: user._id, username: user.username });
      
      res.json({ 
        success: true, 
        message: 'User activated successfully',
        data: user
      });
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to activate user',
        error: error.message 
      });
    }
  }
);

/**
 * POST /api/users/:id/toggle-status
 * Toggle user active/inactive status
 * Hospital admins can only toggle users from their hospital
 */
router.post('/:id/toggle-status',
  authService.authenticationMiddleware(),
  async (req, res) => {
    try {
      // Prevent self-deactivation
      if (req.user && req.user.id === req.params.id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot toggle your own account status' 
        });
      }
      
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Multi-tenancy check
      const isSuperAdmin = req.user.roles?.includes('system:admin') || 
                           req.user.roles?.includes('super_admin');
      
      if (!isSuperAdmin && req.user.hospitalId && user.hospitalId !== req.user.hospitalId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: You can only toggle users from your hospital' 
        });
      }
      
      // Toggle status
      user.isActive = !user.isActive;
      await user.save();
      
      const userResponse = user.toObject();
      delete userResponse.password;
      
      console.log('✅ User status toggled:', { 
        id: user._id, 
        username: user.username, 
        isActive: user.isActive 
      });
      
      res.json({ 
        success: true, 
        message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
        data: userResponse
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to toggle user status',
        error: error.message 
      });
    }
  }
);

/**
 * PUT /api/users/:id/password
 * Change user password (admin only)
 */
router.put('/:id/password',
  authService.authenticationMiddleware(),
  rbacService.requirePermission('system:admin'),
  async (req, res) => {
    try {
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password must be at least 6 characters' 
        });
      }
      
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      user.password = newPassword; // Will be hashed by pre-save hook
      await user.save();
      
      console.log('✅ User password changed:', { id: user._id, username: user.username });
      
      res.json({ 
        success: true, 
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to change password',
        error: error.message 
      });
    }
  }
);

module.exports = router;
